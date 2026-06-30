import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { OwnerPaymentsService } from '../../core/owner-payments.service';
import { OwnerPayment } from '../../core/models';

@Component({
  selector: 'app-payment-detail',
  templateUrl: './payment-detail.page.html',
  styleUrls: ['./payment-detail.page.scss'],
  standalone: false
})
export class PaymentDetailPage {
  payment: OwnerPayment | null = null;
  loading = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private svc: OwnerPaymentsService,
    private navCtrl: NavController
  ) {}

  ionViewWillEnter(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.navCtrl.back(); return; }
    this.load(id);
  }

  load(id: string): void {
    this.loading = true;
    this.error = '';
    this.svc.getById(id).subscribe({
      next: p => { this.payment = p; this.loading = false; },
      error: () => { this.error = 'No se pudo cargar el pago.'; this.loading = false; }
    });
  }

  back(): void { this.navCtrl.back(); }

  get statusLabel(): string {
    const map: Record<string, string> = {
      Pending: 'Pendiente', UnderReview: 'En Revisión',
      Approved: 'Aprobado', Rejected: 'Rechazado'
    };
    return map[this.payment?.status ?? ''] ?? '';
  }

  get statusColor(): string {
    const map: Record<string, string> = {
      Pending: 'warning', UnderReview: 'primary',
      Approved: 'success', Rejected: 'danger'
    };
    return map[this.payment?.status ?? ''] ?? 'medium';
  }

  fmt(value: number | null | undefined): string {
    if (value == null) return '—';
    return 'Gs. ' + new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(value);
  }

  dateLabel(value: string | null | undefined): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
  }

  dateTimeLabel(value: string | null | undefined): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('es-PY', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(value));
  }
}
