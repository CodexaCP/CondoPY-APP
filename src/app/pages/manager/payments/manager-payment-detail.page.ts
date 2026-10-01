import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, NavController, ToastController } from '@ionic/angular';
import { switchMap } from 'rxjs/operators';
import { resolveUploadUrl } from '../../../core/file-url.util';
import { ManagerApiService } from '../../../core/manager-api.service';
import { ManagerStateService } from '../../../core/manager-state.service';
import { ManagerOwnerPayment } from '../../../core/manager.models';
import { PlanGateService } from '../../../core/plan-gate.service';
import { errorMessage, fmtDate, fmtDateTime, formatGs, isPdf } from '../manager.util';

@Component({
  selector: 'app-manager-payment-detail',
  templateUrl: './manager-payment-detail.page.html',
  styleUrls: ['../manager.shared.scss', './manager-payment-detail.page.scss'],
  standalone: false,
})
export class ManagerPaymentDetailPage {
  payment: ManagerOwnerPayment | null = null;
  loading = true;
  error = '';
  acting = false;
  imageOpen = false;

  // Monto verificado que escribe el Encargado (se precarga con el declarado).
  amount: number | null = null;

  readonly gs = formatGs;
  readonly date = fmtDate;
  readonly dateTime = fmtDateTime;

  constructor(
    private route: ActivatedRoute,
    private api: ManagerApiService,
    private state: ManagerStateService,
    private gate: PlanGateService,
    private navCtrl: NavController,
    private alerts: AlertController,
    private toasts: ToastController
  ) {}

  ionViewWillEnter(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { void this.navCtrl.navigateBack('/manager/payments'); return; }
    this.load(id);
  }

  get readOnly(): boolean { return this.gate.readOnly; }
  get comprobante(): string { return resolveUploadUrl(this.payment?.comprobanteUrl); }
  get comprobanteIsPdf(): boolean { return isPdf(this.payment?.comprobanteUrl); }

  // Se puede actuar si el pago es procesable (todas sus unidades son de edificios del Encargado) y el plan lo permite.
  get canAct(): boolean { return !!this.payment?.canProcess && !this.readOnly; }
  get isPending(): boolean { return this.payment?.status === 'Pending'; }
  get isUnderReview(): boolean { return this.payment?.status === 'UnderReview'; }

  statusLabel(status: string): string {
    switch (status) {
      case 'Pending': return 'Por revisar';
      case 'UnderReview': return 'En revisión';
      case 'Approved': return 'Aprobado';
      case 'Rejected': return 'Rechazado';
      default: return status;
    }
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Pending': return 'warn';
      case 'UnderReview': return 'info';
      case 'Approved': return 'ok';
      case 'Rejected': return 'danger';
      default: return 'muted';
    }
  }

  load(id: string): void {
    this.loading = true;
    this.error = '';
    this.api.getPayment(id).subscribe({
      next: p => {
        this.payment = p;
        this.amount = p.reviewedAmount ?? p.declaredAmount;
        this.loading = false;
      },
      error: err => {
        this.error = errorMessage(err, 'No se pudo cargar el pago.');
        this.loading = false;
      }
    });
  }

  openPdf(): void {
    window.open(this.comprobante, '_system');
  }

  // ── Acciones ─────────────────────────────────────────────────────────────

  // Atajo en un toque: una sola confirmación y se hacen los dos pasos seguidos (verificar monto y aprobar).
  async verifyAndApprove(): Promise<void> {
    const p = this.payment;
    if (!p || !this.validAmount()) return;

    const amount = this.amount as number;
    const confirmed = await this.confirm(
      'Verificar y aprobar',
      `Vas a aprobar el pago de ${p.ownerFullName} por ${formatGs(amount)}. Se aplica a sus cargos y se notifica al propietario.`,
      'Aprobar'
    );
    if (!confirmed) return;

    this.acting = true;
    this.api.reviewPayment(p.id, amount).pipe(
      switchMap(() => this.api.approvePayment(p.id))
    ).subscribe({
      next: () => this.finish('Pago aprobado'),
      error: err => this.failed(err, p.id)
    });
  }

  // Solo registrar el monto verificado (queda "En revisión") sin aprobar todavía.
  async verifyOnly(): Promise<void> {
    const p = this.payment;
    if (!p || !this.validAmount()) return;

    const amount = this.amount as number;
    const confirmed = await this.confirm(
      'Verificar monto',
      `Registrar ${formatGs(amount)} como monto verificado. El pago pasa a "En revisión" y queda pendiente de aprobar.`,
      'Verificar'
    );
    if (!confirmed) return;

    this.acting = true;
    this.api.reviewPayment(p.id, amount).subscribe({
      next: () => { this.acting = false; void this.toast('Monto verificado'); this.state.refresh().subscribe(); this.load(p.id); },
      error: err => this.failed(err, p.id)
    });
  }

  async approve(): Promise<void> {
    const p = this.payment;
    if (!p) return;

    const confirmed = await this.confirm(
      'Aprobar pago',
      `Vas a aprobar el pago de ${p.ownerFullName} por ${formatGs(p.reviewedAmount ?? p.declaredAmount)}. Se aplica a sus cargos y se notifica al propietario.`,
      'Aprobar'
    );
    if (!confirmed) return;

    this.acting = true;
    this.api.approvePayment(p.id).subscribe({
      next: () => this.finish('Pago aprobado'),
      error: err => this.failed(err, p.id)
    });
  }

  async reject(): Promise<void> {
    const p = this.payment;
    if (!p) return;

    const alert = await this.alerts.create({
      header: 'Rechazar pago',
      message: 'Indicá el motivo. Se le envía al propietario.',
      inputs: [{ name: 'reason', type: 'textarea', placeholder: 'Motivo del rechazo', attributes: { maxlength: 500 } }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Rechazar',
          role: 'destructive',
          handler: (data: { reason?: string }) => {
            const reason = (data.reason ?? '').trim();
            if (!reason) return false; // el motivo es obligatorio: no se cierra el cuadro
            this.doReject(p.id, reason);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  private doReject(id: string, reason: string): void {
    this.acting = true;
    this.api.rejectPayment(id, reason).subscribe({
      next: () => this.finish('Pago rechazado'),
      error: err => this.failed(err, id)
    });
  }

  private validAmount(): boolean {
    if (this.amount === null || !Number.isFinite(Number(this.amount)) || Number(this.amount) <= 0) {
      void this.toast('Ingresá un monto verificado mayor a cero', 'warning');
      return false;
    }
    this.amount = Number(this.amount);
    return true;
  }

  private finish(message: string): void {
    this.acting = false;
    void this.toast(message);
    this.state.refresh().subscribe();
    void this.navCtrl.navigateBack('/manager/payments');
  }

  // Los 400/403 del backend traen el motivo exacto (por ejemplo "el monto no coincide con los comprobantes").
  // Si el primer paso funcionó y el segundo falló, el pago queda "En revisión": se recarga para mostrarlo.
  private async failed(err: unknown, id: string): Promise<void> {
    this.acting = false;
    const alert = await this.alerts.create({
      header: 'No se pudo completar',
      message: errorMessage(err, 'Ocurrió un error. Intentá de nuevo.'),
      buttons: ['Entendido']
    });
    await alert.present();
    this.state.refresh().subscribe();
    this.load(id);
  }

  private async confirm(header: string, message: string, okText: string): Promise<boolean> {
    return new Promise<boolean>(async resolve => {
      const alert = await this.alerts.create({
        header,
        message,
        buttons: [
          { text: 'Cancelar', role: 'cancel', handler: () => resolve(false) },
          { text: okText, handler: () => resolve(true) }
        ],
        backdropDismiss: false
      });
      await alert.present();
    });
  }

  private async toast(message: string, color: 'success' | 'warning' = 'success'): Promise<void> {
    const t = await this.toasts.create({ message, duration: 2500, position: 'top', color });
    await t.present();
  }
}
