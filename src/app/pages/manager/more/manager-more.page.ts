import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { AlertController } from '@ionic/angular';
import { Subscription, combineLatest, interval, of } from 'rxjs';
import { catchError, startWith, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../core/auth.service';
import { BuildingContextService } from '../../../core/building-context.service';
import { MarketplaceService } from '../../../core/marketplace.service';
import { NotificationsService } from '../../../core/notifications.service';
import { PushService } from '../../../core/push.service';
import { roleLabel } from '../../../core/roles';

@Component({
  selector: 'app-manager-more',
  templateUrl: './manager-more.page.html',
  styleUrls: ['../manager.shared.scss', './manager-more.page.scss'],
  standalone: false,
})
export class ManagerMorePage implements OnInit, OnDestroy {
  unreadCount = 0;
  versionName = '';
  // El módulo es por edificio: la entrada aparece solo si el edificio elegido lo tiene disponible y el rol revisa pagos.
  marketplaceAvailable = false;

  private sub = new Subscription();

  constructor(
    private auth: AuthService,
    private router: Router,
    private notifications: NotificationsService,
    private pushSvc: PushService,
    private alerts: AlertController,
    private buildings: BuildingContextService,
    private market: MarketplaceService
  ) {}

  get user() { return this.auth.getUser(); }
  get role(): string { return roleLabel(this.user?.role); }
  get initials(): string {
    return (this.user?.fullName ?? '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  ngOnInit(): void {
    this.sub.add(
      interval(30_000).pipe(
        startWith(0),
        switchMap(() => this.notifications.getUnreadCount().pipe(catchError(() => of({ count: 0 }))))
      ).subscribe(dto => { this.unreadCount = dto.count; })
    );

    this.sub.add(
      combineLatest([this.buildings.selected$, this.market.staffBuildings$]).subscribe(([selected, list]) => {
        this.marketplaceAvailable = !!selected && list.some(b => b.buildingId === selected.id && b.canReviewPayments);
      })
    );

    App.getInfo().then(info => { this.versionName = `${info.version} (${info.build})`; }).catch(() => { /* navegador */ });
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  // El SuperAdmin pudo habilitar o apagar el módulo desde la última vez: se vuelve a consultar al entrar.
  ionViewWillEnter(): void {
    this.market.loadStaffBuildings().pipe(catchError(() => of([]))).subscribe();
  }

  go(path: string): void { void this.router.navigateByUrl(path); }

  async confirmLogout(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Cerrar sesión',
      message: '¿Querés salir de CondoPY?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Salir', role: 'destructive', handler: () => this.logout() }
      ]
    });
    await alert.present();
  }

  private logout(): void {
    this.pushSvc.unregister();
    this.auth.logout();
  }
}
