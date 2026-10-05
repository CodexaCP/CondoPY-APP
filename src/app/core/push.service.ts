import { Injectable, NgZone } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ActionPerformed, PushNotificationSchema, PushNotifications, Token } from '@capacitor/push-notifications';
import { NotificationsService, resolveNotificationRoute } from './notifications.service';
import { NotificationAlertService } from './notification-alert.service';
import { AuthService } from './auth.service';

// Mismo id que manda el backend en cada push (FirebaseCloudMessagingSender) y que declara el AndroidManifest.
const CHANNEL_ID = 'default';

@Injectable({ providedIn: 'root' })
export class PushService {
  private listenersRegistered = false;
  private lastToken: string | null = null;

  constructor(
    private notificationsSvc: NotificationsService,
    private alerts: NotificationAlertService,
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

    // Con la app abierta Android no muestra la push en la barra de estado: el aviso sale como banner dentro de la app.
    // La push solo adelanta la consulta de la bandeja (el banner sale con los datos reales de la notificación).
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      this.zone.run(() => {
        void this.alerts.refresh({
          title: notification.title ?? '',
          body: notification.body ?? '',
          data: (notification.data ?? {}) as Record<string, string>
        });
      });
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      const data = (action.notification.data ?? {}) as Record<string, string>;
      this.alerts.markEntityRead(data['entityType'], data['entityId']);
      const route = resolveNotificationRoute(data, this.auth.getUser()?.role);
      if (route) {
        this.zone.run(() => this.navCtrl.navigateForward(route.path, route.state ? { state: route.state } : undefined));
      }
    });
  }

  private async requestAndRegister(): Promise<void> {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') return;
    // Android 8+: sin canal propio la push cae en un canal genérico que no abre el aviso emergente arriba de la pantalla.
    // Crear un canal que ya existe no lo pisa, así que es seguro hacerlo en cada arranque.
    await PushNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Avisos de CondoPY',
      description: 'Pagos, facturas, comunicados, reservas y demás avisos del condominio',
      importance: 4,
      visibility: 1,
      vibration: true,
      lights: true
    }).catch(() => { /* navegador o plataforma sin canales */ });
    await PushNotifications.register();
  }
}
