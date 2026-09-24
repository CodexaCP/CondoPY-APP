import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, NavController, ToastController } from '@ionic/angular';
import { AuthService } from '../../core/auth.service';
import { SettlementReviewService } from '../../core/settlement-review.service';
import { PresidentSettlementExpenseItem, PresidentSettlementReview } from '../../core/models';

const CATEGORY_LABEL: Record<string, string> = {
  Utilities: 'Servicios',
  Cleaning: 'Limpieza',
  Security: 'Seguridad',
  Maintenance: 'Mantenimiento',
  Elevator: 'Ascensor',
  Insurance: 'Seguro',
  Payroll: 'Salarios',
  Taxes: 'Impuestos',
  Administration: 'Administración',
  ReserveFund: 'Fondo de reserva',
  Extraordinary: 'Extraordinario',
  Supplies: 'Insumos',
  Ande: 'ANDE',
  Essap: 'ESSAP',
  InternetPhone: 'Internet y telefonía',
  Other: 'Otro'
};

@Component({
  selector: 'app-settlement-review',
  templateUrl: './settlement-review.page.html',
  styleUrls: ['./settlement-review.page.scss'],
  standalone: false
})
export class SettlementReviewPage {
  review: PresidentSettlementReview | null = null;
  loading = false;
  error = '';
  acting = false;

  constructor(
    private route: ActivatedRoute,
    private svc: SettlementReviewService,
    private auth: AuthService,
    private navCtrl: NavController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ionViewWillEnter(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.navCtrl.back(); return; }
    this.load(id);
  }

  load(id: string): void {
    this.loading = true;
    this.error = '';
    this.svc.getReview(id).subscribe({
      next: r => { this.review = r; this.loading = false; },
      error: err => {
        this.loading = false;
        this.error = err?.status === 403
          ? 'Esta liquidación ya no está disponible para tu revisión (puede que ya haya sido aprobada, rechazada, o todavía no te corresponda revisarla).'
          : 'No se pudo cargar la liquidación.';
      }
    });
  }

  back(): void { this.navCtrl.navigateRoot('/area/dashboard'); }

  categoryLabel(category: string): string { return CATEGORY_LABEL[category] ?? category; }

  openReceipt(expense: PresidentSettlementExpenseItem): void {
    if (!expense.hasReceipt) return;
    const url = this.svc.getReceiptUrl(expense.id, this.auth.getToken() ?? '');
    window.open(url, '_blank');
  }

  async confirmApprove(): Promise<void> {
    if (!this.review) return;
    const alert = await this.alertCtrl.create({
      header: 'Aprobar liquidación',
      message: 'Al aprobar, firmás la liquidación de este período. Quedará lista para que la empresa la publique.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Sí, aprobar', handler: () => this.approve() }
      ]
    });
    await alert.present();
  }

  private approve(): void {
    if (!this.review) return;
    this.acting = true;
    this.svc.approve(this.review.settlement.expensePeriodId).subscribe({
      next: async () => {
        this.acting = false;
        await this.showToast('Liquidación aprobada. Quedó firmada y lista para publicar.', 'success');
        this.back();
      },
      error: async err => {
        this.acting = false;
        await this.showToast(this.extractError(err, 'No se pudo aprobar la liquidación.'), 'danger');
      }
    });
  }

  async confirmReject(): Promise<void> {
    if (!this.review) return;
    const alert = await this.alertCtrl.create({
      header: 'Rechazar liquidación',
      message: 'Contanos el motivo del rechazo (obligatorio). El encargado de edificio lo va a recibir para corregirla.',
      inputs: [{ name: 'reason', type: 'textarea', placeholder: 'Motivo del rechazo...' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Rechazar',
          handler: (data: { reason?: string }) => {
            const reason = (data?.reason ?? '').trim();
            if (!reason) {
              this.showToast('El motivo de rechazo es obligatorio.', 'warning');
              return false;
            }
            this.reject(reason);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  private reject(reason: string): void {
    if (!this.review) return;
    this.acting = true;
    this.svc.reject(this.review.settlement.expensePeriodId, reason).subscribe({
      next: async () => {
        this.acting = false;
        await this.showToast('Liquidación rechazada. Se notificó al encargado de edificio.', 'success');
        this.back();
      },
      error: async err => {
        this.acting = false;
        await this.showToast(this.extractError(err, 'No se pudo rechazar la liquidación.'), 'danger');
      }
    });
  }

  fmt(value: number | null | undefined): string {
    if (value == null) return '—';
    return 'Gs. ' + new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(value);
  }

  dateLabel(value: string | null | undefined): string {
    if (!value) return '—';
    return new Intl.DateTimeFormat('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
  }

  private extractError(err: any, fallback: string): string {
    const body = err?.error;
    return (typeof body === 'string' ? body : (body?.message ?? body?.title ?? body?.detail)) ?? fallback;
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 4000, color, position: 'bottom' });
    await toast.present();
  }
}
