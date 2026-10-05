import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { NotificationsService, resolveNotificationRoute } from '../../core/notifications.service';
import { AuthService } from '../../core/auth.service';
import { AppNotification } from '../../core/models';
import { NotificationAlertService } from '../../core/notification-alert.service';
import { notificationColor, notificationVisual } from '../../core/notification-visuals';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.page.html',
  styleUrls: ['./notifications.page.scss'],
  standalone: false
})
export class NotificationsPage {
  items: AppNotification[] = [];
  loading = false;
  markingAll = false;
  error = '';

  get unreadCount(): number {
    return this.items.filter(n => !n.isRead).length;
  }

  constructor(
    private svc: NotificationsService,
    private auth: AuthService,
    private navCtrl: NavController,
    private alerts: NotificationAlertService
  ) {}

  ionViewWillEnter(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.svc.getAll().subscribe({
      next: items => { this.items = items; this.loading = false; },
      error: () => { this.error = 'No se pudieron cargar las notificaciones.'; this.loading = false; }
    });
  }

  refresh(event: any): void {
    this.svc.getAll().subscribe({
      next: items => { this.items = items; event.target.complete(); },
      error: () => { event.target.complete(); }
    });
  }

  handleTap(n: AppNotification): void {
    if (!n.isRead) {
      n.isRead = true;
      this.svc.markRead(n.id).subscribe(() => void this.alerts.refresh());
    }
    const route = resolveNotificationRoute(n, this.auth.getUser()?.role);
    if (route) {
      this.navCtrl.navigateForward(route.path, route.state ? { state: route.state } : undefined);
    }
  }

  markAllAsRead(): void {
    this.markingAll = true;
    this.svc.markAllRead().subscribe({
      next: () => { this.items.forEach(n => n.isRead = true); this.markingAll = false; void this.alerts.refresh(); },
      error: () => { this.markingAll = false; }
    });
  }

  typeIcon(type: string): string  { return notificationVisual(type).icon; }
  typeColor(type: string): string { return notificationColor(type); }

  dateTimeLabel(value: string): string {
    return new Intl.DateTimeFormat('es-PY', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(value));
  }
}
