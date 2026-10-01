import { Injectable, NgZone } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ActionPerformed, PushNotifications, Token } from '@capacitor/push-notifications';
import { NotificationsService, resolveNotificationRoute } from './notifications.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PushService {
  private listenersRegistered = false;
  private lastToken: string | null = null;

  constructor(
    private notificationsSvc: NotificationsService,
    private auth: AuthService,
    private navCtrl: NavController,
    private zone: NgZone
  ) {}

  async init(): Promise<void> {
    if (!this.listenersRegistered) {
      this.registerListeners();
      this.listenersRegistered = true;
    }

    if (this.auth.isLoggedIn()) {
      await this.requestAndRegister();
    }
  }

  async unregister(): Promise<void> {
    if (this.lastToken) {
      this.notificationsSvc.unregisterDeviceToken(this.lastToken).subscribe();
    }
  }

  private registerListeners(): void {
    PushNotifications.addListener('registration', (token: Token) => {
      this.lastToken = token.value;
      if (this.auth.isLoggedIn()) {
        this.notificationsSvc.registerDeviceToken(token.value).subscribe();
      }
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error registrando push notifications', error);
    });

    // Con la app en foreground, Android no muestra la notificacion en la barra de estado por si
    // sola (a diferencia de background/killed). Mostrarla ahi tambien queda para una mejora futura
    // con @capacitor/local-notifications.
    PushNotifications.addListener('pushNotificationReceived', () => {});

    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      const data = (action.notification.data ?? {}) as Record<string, string>;
      const route = resolveNotificationRoute(data, this.auth.getUser()?.role);
      if (route) {
        this.zone.run(() => this.navCtrl.navigateForward(route.path, route.state ? { state: route.state } : undefined));
      }
    });
  }

  private async requestAndRegister(): Promise<void> {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;
    await PushNotifications.register();
  }
}
