import { Component, ElementRef, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/auth.service';
import { canPayExpenses, roleLabel as roleName } from '../../../core/roles';
import { NotificationAlertService } from '../../../core/notification-alert.service';
import { AnnouncementsService } from '../../../core/announcements.service';
import { AccountService } from '../../../core/account.service';
import { MarketplaceService } from '../../../core/marketplace.service';
import { AdsService, DEFAULT_ROTATION_SECONDS } from '../../../core/ads.service';
import { resolveUploadUrl } from '../../../core/file-url.util';
import { LoginResponse, MyUnit, AccountStatementPeriod, Announcement, AdSlot } from '../../../core/models';

const CAT_ICON: Record<string, string> = {
  General:      'information-circle-outline',
  Mantenimiento:'construct-outline',
  Seguridad:    'shield-checkmark-outline',
  Financiero:   'cash-outline',
  Convocatoria: 'megaphone-outline',
  Otro:         'ellipsis-horizontal-circle-outline'
};

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit, OnDestroy {
  user: LoginResponse | null = null;
  unreadCount = 0;

  balanceLoading = true;
  primaryUnit: MyUnit | null = null;
  latestPeriod: AccountStatementPeriod | null = null;
  unitsCount = 0;
  marketplaceAvailable = false;
  totalBalance = 0;

  comunicados: Announcement[] = [];
  comunicadosLoading = true;

  // Publicidad: vacía si ninguno de mis edificios tiene el módulo activado.
  ads: AdSlot[] = [];
  adsPhone: string | null = null;
  @ViewChild('adsRow') adsRow?: ElementRef<HTMLElement>;
  private adsTimer?: ReturnType<typeof setInterval>;
  private adsRotationMs = DEFAULT_ROTATION_SECONDS * 1000;
  private adsResume?: ReturnType<typeof setTimeout>;

  private pollSub?: Subscription;

  get initials(): string {
    return (this.user?.fullName ?? '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  get roleLabel(): string {
    return roleName(this.user?.role);
  }

  // «Mis pagos» es solo del propietario (el backend no atiende pagos de expensas de un residente).
  get canPay(): boolean {
    return canPayExpenses(this.user?.role);
  }

  get balancePositive(): boolean {
    return this.unitsCount > 1 ? true : (this.latestPeriod?.runningBalance ?? 0) >= 0;
  }

  constructor(
    private auth: AuthService,
    private router: Router,
    private alerts: NotificationAlertService,
    private announcementsSvc: AnnouncementsService,
    private accountSvc: AccountService,
    private marketplaceSvc: MarketplaceService,
    private adsSvc: AdsService
  ) {}

  ngOnInit(): void {
    this.user = this.auth.getUser();
    // El contador de la campana lo mantiene el servicio de avisos (consulta cada 30 s y al llegar una push).
    this.pollSub = this.alerts.unreadCount$.subscribe(count => { this.unreadCount = count; });
  }

  ionViewWillEnter(): void {
    this.loadBalance();
    this.loadComunicados();
    this.marketplaceSvc.loadBuildings(true).pipe(catchError(() => of([]))).subscribe(b => { this.marketplaceAvailable = b.length > 0; });
  }

  loadBalance(): void {
    this.balanceLoading = true;
    this.auth.getMyUnits().pipe(catchError(() => of([]))).subscribe(units => {
      this.unitsCount = units.length;
      this.loadAds(units);
      this.primaryUnit = units.find(u => u.isPrimary) ?? units[0] ?? null;
      if (!this.primaryUnit) { this.balanceLoading = false; return; }
      forkJoin(units.map(u =>
        this.accountSvc.getPeriods(u.unitId).pipe(catchError(() => of([] as AccountStatementPeriod[])))
      )).subscribe(periodsPerUnit => {
        const primaryIdx = units.findIndex(u => u.unitId === this.primaryUnit!.unitId);
        this.latestPeriod = periodsPerUnit[primaryIdx]?.[0] ?? null;
        this.totalBalance = periodsPerUnit.reduce((sum, periods) => sum + Math.max(periods[0]?.runningBalance ?? 0, 0), 0);
        this.balanceLoading = false;
      });
    });
  }

  loadComunicados(): void {
    this.comunicadosLoading = true;
    this.announcementsSvc.getMine().pipe(catchError(() => of([]))).subscribe(items => {
      this.comunicados = items.slice(0, 2);
      this.comunicadosLoading = false;
    });
  }

  loadAds(units: MyUnit[]): void {
    this.adsSvc.getForBuildings(units.map(u => u.buildingId)).pipe(catchError(() => of({ slots: [], managerPhone: null, rotationSeconds: DEFAULT_ROTATION_SECONDS }))).subscribe(res => {
      this.ads = res.slots;
      this.adsPhone = res.managerPhone;
      this.adsRotationMs = Math.max(res.rotationSeconds || DEFAULT_ROTATION_SECONDS, 1) * 1000;
      this.startAdsRotation();
    });
  }

  // Los banners avanzan solos cada tanto (lo define el SuperAdmin por edificio, 10 s por defecto) (y vuelven al primero al llegar al último). Se detienen mientras la persona
  // toca o desliza la fila y siguen un rato después de soltarla.
  startAdsRotation(): void {
    this.stopAdsRotation();
    if (this.ads.length < 2) return;
    this.adsTimer = setInterval(() => this.nextAd(), this.adsRotationMs);
  }

  stopAdsRotation(): void {
    if (this.adsTimer) clearInterval(this.adsTimer);
    if (this.adsResume) clearTimeout(this.adsResume);
    this.adsTimer = undefined;
    this.adsResume = undefined;
  }

  pauseAds(): void {
    this.stopAdsRotation();
  }

  resumeAdsLater(): void {
    if (this.adsResume) clearTimeout(this.adsResume);
    this.adsResume = setTimeout(() => this.startAdsRotation(), this.adsRotationMs);
  }

  private nextAd(): void {
    const row = this.adsRow?.nativeElement;
    const cards = row ? Array.from(row.children) as HTMLElement[] : [];
    if (!row || cards.length < 2) return;

    const first = cards[0].offsetLeft;
    // Tarjeta que está a la vista (la más cercana al borde izquierdo); la siguiente, o la primera si ya es la última.
    let current = 0;
    cards.forEach((c, i) => {
      if (Math.abs(c.offsetLeft - first - row.scrollLeft) < Math.abs(cards[current].offsetLeft - first - row.scrollLeft)) current = i;
    });
    const next = (current + 1) % cards.length;
    row.scrollTo({ left: cards[next].offsetLeft - first, behavior: 'smooth' });
  }

  adImage(ad: AdSlot): string { return resolveUploadUrl(ad.imageUrl); }

  openAd(ad: AdSlot): void {
    const url = this.adsSvc.linkFor(ad.ctaUrl);
    if (url) window.open(url, '_blank');
  }

  callManager(): void {
    if (this.adsPhone) window.open(`tel:${this.adsPhone.replace(/[^\d+]/g, '')}`, '_system');
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('es-PY').format(Math.abs(Math.round(amount)));
  }

  catIcon(cat: string): string  { return CAT_ICON[cat] ?? 'megaphone-outline'; }
  catClass(cat: string): string {
    const map: Record<string, string> = {
      General: 'pill-teal', Mantenimiento: 'pill-amber', Seguridad: 'pill-danger',
      Financiero: 'pill-green', Convocatoria: 'pill-purple', Otro: 'pill-muted'
    };
    return map[cat] ?? 'pill-muted';
  }

  dateLabel(value: string | null): string {
    if (!value) return '';
    return new Intl.DateTimeFormat('es-PY', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(new Date(value));
  }

  goUnits():      void { this.router.navigateByUrl('/area/units'); }
  goExpensas():   void { this.router.navigateByUrl('/area/account'); }
  goPagos():      void { this.router.navigateByUrl('/area/payments'); }
  goReclamos():   void { this.router.navigateByUrl('/area/claims'); }
  goNotif():      void { this.router.navigateByUrl('/area/notifications'); }
  goComunicados():void { this.router.navigateByUrl('/area-comun'); }
  goAmenities():   void { this.router.navigateByUrl('/area/amenities'); }
  goMarketplace(): void { this.router.navigateByUrl('/area/marketplace'); }

  ionViewWillLeave(): void { this.stopAdsRotation(); }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
    this.stopAdsRotation();
  }
}
