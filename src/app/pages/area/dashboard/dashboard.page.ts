import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, interval, of } from 'rxjs';
import { startWith, switchMap, catchError } from 'rxjs/operators';
import { AuthService } from '../../../core/auth.service';
import { NotificationsService } from '../../../core/notifications.service';
import { AnnouncementsService } from '../../../core/announcements.service';
import { AccountService } from '../../../core/account.service';
import { LoginResponse, MyUnit, AccountStatementPeriod, Announcement } from '../../../core/models';

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

  comunicados: Announcement[] = [];
  comunicadosLoading = true;

  private pollSub?: Subscription;

  get initials(): string {
    return (this.user?.fullName ?? '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  get roleLabel(): string {
    const map: Record<string, string> = { Owner: 'Propietario', Resident: 'Residente', Porter: 'Encargado' };
    return map[this.user?.role ?? ''] ?? this.user?.role ?? '';
  }

  get balancePositive(): boolean {
    return (this.latestPeriod?.runningBalance ?? 0) >= 0;
  }

  constructor(
    private auth: AuthService,
    private router: Router,
    private notificationsSvc: NotificationsService,
    private announcementsSvc: AnnouncementsService,
    private accountSvc: AccountService
  ) {}

  ngOnInit(): void {
    this.user = this.auth.getUser();
    this.pollSub = interval(30_000).pipe(
      startWith(0),
      switchMap(() => this.notificationsSvc.getUnreadCount().pipe(catchError(() => of({ count: 0 }))))
    ).subscribe(dto => { this.unreadCount = dto.count; });
  }

  ionViewWillEnter(): void {
    this.loadBalance();
    this.loadComunicados();
  }

  loadBalance(): void {
    this.balanceLoading = true;
    this.auth.getMyUnits().pipe(catchError(() => of([]))).subscribe(units => {
      this.primaryUnit = units.find(u => u.isPrimary) ?? units[0] ?? null;
      if (!this.primaryUnit) { this.balanceLoading = false; return; }
      this.accountSvc.getPeriods(this.primaryUnit.unitId)
        .pipe(catchError(() => of([])))
        .subscribe(periods => {
          this.latestPeriod = periods[0] ?? null;
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
    return new Intl.DateTimeFormat('es-PY', { day: '2-digit', month: '2-digit' }).format(new Date(value));
  }

  goUnits():      void { this.router.navigateByUrl('/area/units'); }
  goExpensas():   void { this.router.navigateByUrl('/area/account'); }
  goPagos():      void { this.router.navigateByUrl('/area/payments'); }
  goReclamos():   void { this.router.navigateByUrl('/area/claims'); }
  goNotif():      void { this.router.navigateByUrl('/area/notifications'); }
  goComunicados():void { this.router.navigateByUrl('/area-comun'); }

  ngOnDestroy(): void { this.pollSub?.unsubscribe(); }
}
