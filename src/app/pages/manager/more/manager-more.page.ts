import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { AlertController } from '@ionic/angular';
import { Subscription, interval, of } from 'rxjs';
import { catchError, startWith, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../core/auth.service';
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

  private sub = new Subscription();

  constructor(
    private auth: AuthService,
    private router: Router,
    private notifications: NotificationsService,
    private pushSvc: PushService,
    private alerts: AlertController
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

    App.getInfo().then(info => { this.versionName = `${info.version} (${info.build})`; }).catch(() => { /* navegador */ });
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

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
