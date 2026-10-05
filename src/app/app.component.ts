import { Component, OnDestroy, OnInit } from '@angular/core';
import { App } from '@capacitor/app';
import { AuthService } from './core/auth.service';
import { PushService } from './core/push.service';
import { NotificationAlertService } from './core/notification-alert.service';
import { VersionService } from './core/version.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  private resumeListener?: { remove: () => Promise<void> };

  constructor(
    private auth: AuthService,
    private pushSvc: PushService,
    private notificationAlerts: NotificationAlertService,
    private version: VersionService
  ) {}

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.pushSvc.init();
    }
    // Avisos en pantalla: arrancan siempre; sin sesión no consultan nada y al iniciar sesión empiezan solos.
    this.notificationAlerts.start();

    // Versión mínima: al abrir y cada vez que la app vuelve a primer plano.
    void this.version.check();
    App.addListener('appStateChange', state => {
      if (state.isActive) {
        void this.version.check();
        void this.notificationAlerts.refresh();
      }
    }).then(handle => (this.resumeListener = handle)).catch(() => { /* navegador: sin listener nativo */ });
  }

  ngOnDestroy(): void {
    void this.resumeListener?.remove();
  }
}
