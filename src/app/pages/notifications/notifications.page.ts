import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { NotificationsService } from '../../core/notifications.service';
import { AppNotification } from '../../core/models';

const TYPE_ICON: Record<string, string> = {
  OwnerPaymentSubmitted: 'cloud-upload-outline',
  PaymentUnderReview:    'search-outline',
  PaymentApproved:       'checkmark-circle-outline',
  PaymentRejected:       'close-circle-outline'
};

const TYPE_COLOR: Record<string, string> = {
  OwnerPaymentSubmitted: '#f59e0b',
  PaymentUnderReview:    '#3b82f6',
  PaymentApproved:       '#22c55e',
  PaymentRejected:       '#ef4444'
};

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
    private navCtrl: NavController
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
      this.svc.markRead(n.id).subscribe();
    }
    if (n.entityType === 'OwnerPayment' && n.entityId) {
      this.navCtrl.navigateForward(`/area/payments/${n.entityId}`);
    }
  }

  markAllAsRead(): void {
    this.markingAll = true;
    this.svc.markAllRead().subscribe({
      next: () => { this.items.forEach(n => n.isRead = true); this.markingAll = false; },
      error: () => { this.markingAll = false; }
    });
  }

  typeIcon(type: string): string  { return TYPE_ICON[type]  ?? 'notifications-outline'; }
  typeColor(type: string): string { return TYPE_COLOR[type] ?? '#64748b'; }

  dateTimeLabel(value: string): string {
    return new Intl.DateTimeFormat('es-PY', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(value));
  }
}
