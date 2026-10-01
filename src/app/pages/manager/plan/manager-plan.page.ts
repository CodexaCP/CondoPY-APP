import { Component } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../core/auth.service';
import { BuildingContextService } from '../../../core/building-context.service';
import { ManagerApiService } from '../../../core/manager-api.service';
import { ManagerStateService } from '../../../core/manager-state.service';
import { ManagerPlan, ManagerPlanPayment } from '../../../core/manager.models';
import { PlanGateService } from '../../../core/plan-gate.service';
import { PushService } from '../../../core/push.service';
import { UploadService } from '../../../core/upload.service';
import { errorMessage, fmtDate } from '../manager.util';

// Más grave primero: es el plan que hay que regularizar.
const SEVERITY: Record<string, number> = { Blocked: 0, ReadOnly: 1, Expired: 2, ExpiringSoon: 3, Active: 4, Archived: 5 };
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

@Component({
  selector: 'app-manager-plan',
  templateUrl: './manager-plan.page.html',
  styleUrls: ['../manager.shared.scss', './manager-plan.page.scss'],
  standalone: false,
})
export class ManagerPlanPage {
  plans: ManagerPlan[] = [];
  pendingPlanIds = new Set<string>();
  loading = true;
  error = '';

  // Formulario del comprobante
  payFor: ManagerPlan | null = null;
  amount: number | null = null;
  payDate = new Date().toISOString().substring(0, 10);
  photo: File | null = null;
  photoPreview: string | null = null;
  sending = false;
  formError = '';

  readonly date = fmtDate;
  blocked$ = this.gate.blocked$;

  constructor(
    private api: ManagerApiService,
    private buildings: BuildingContextService,
    private state: ManagerStateService,
    private gate: PlanGateService,
    private uploads: UploadService,
    private auth: AuthService,
    private pushSvc: PushService,
    private alerts: AlertController,
    private toasts: ToastController
  ) {}

  get today(): string { return new Date().toISOString().substring(0, 10); }

  ionViewWillEnter(): void {
    this.load();
  }

  refresh(event: CustomEvent): void {
    this.load(event);
  }

  load(event?: CustomEvent): void {
    this.error = '';
    if (this.plans.length === 0) this.loading = true;

    forkJoin({
      plans: this.api.getMyPlans(),
      payments: this.api.getPlanPayments().pipe(catchError(() => of([] as ManagerPlanPayment[])))
    }).subscribe({
      next: ({ plans, payments }) => {
        this.plans = [...plans].sort((a, b) => (SEVERITY[a.status] ?? 9) - (SEVERITY[b.status] ?? 9));
        this.pendingPlanIds = new Set(payments.filter(p => p.status === 'Pending').map(p => p.buildingPlanId));
        this.syncGate();
        this.loading = false;
        event?.detail.complete();
      },
      error: err => {
        this.loading = false;
        this.error = errorMessage(err, 'No se pudo cargar el plan.');
        event?.detail.complete();
      }
    });
  }

  // El estado del plan del edificio seleccionado (o, si no hay selección, el peor) decide las restricciones.
  private syncGate(): void {
    const selectedId = this.buildings.selectedId;
    const plan = this.plans.find(p => p.buildingId === selectedId) ?? this.plans[0];
    this.gate.applyStatus(plan?.status ?? 'Active');
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'Active': return 'Al día';
      case 'ExpiringSoon': return 'Por vencer';
      case 'Expired': return 'Vencido (gracia)';
      case 'ReadOnly': return 'Solo lectura';
      case 'Blocked': return 'Bloqueado';
      default: return status;
    }
  }

  statusClass(status: string): string {
    switch (status) {
      case 'Active': return 'ok';
      case 'ExpiringSoon': case 'Expired': return 'warn';
      case 'ReadOnly': case 'Blocked': return 'danger';
      default: return 'muted';
    }
  }

  hasPending(plan: ManagerPlan): boolean { return this.pendingPlanIds.has(plan.id); }

  // ── Comprobante ──────────────────────────────────────────────────────────
  openPay(plan: ManagerPlan): void {
    this.payFor = plan;
    this.amount = null;
    this.payDate = this.today;
    this.photo = null;
    this.photoPreview = null;
    this.formError = '';
  }

  closePay(): void { this.payFor = null; }

  onPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (file.size > MAX_PHOTO_BYTES) {
      this.formError = 'La foto supera el límite de 10 MB.';
      return;
    }
    this.formError = '';
    this.photo = file;

    const reader = new FileReader();
    reader.onload = () => { this.photoPreview = reader.result as string; };
    reader.readAsDataURL(file);
  }

  removePhoto(): void { this.photo = null; this.photoPreview = null; }

  submit(): void {
    const plan = this.payFor;
    if (!plan) return;

    const amount = Number(this.amount);
    if (!Number.isFinite(amount) || amount <= 0) { this.formError = 'Ingresá el monto pagado.'; return; }
    if (!this.payDate || this.payDate > this.today) { this.formError = 'La fecha del pago no puede ser futura.'; return; }

    this.formError = '';
    this.sending = true;

    // Primero se sube la foto (si hay) y después se envía el comprobante con su URL.
    const upload$ = this.photo ? this.uploads.uploadImage(this.photo) : of<string | null>(null);
    upload$.pipe(
      switchMap(url => this.api.submitPlanPayment({
        buildingPlanId: plan.id,
        declaredAmount: amount,
        paymentDate: this.payDate,
        comprobanteUrl: url,
        reference: null
      }))
    ).subscribe({
      next: () => {
        this.sending = false;
        this.payFor = null;
        void this.toast('Comprobante enviado. Lo revisa el administrador y, al aprobarlo, se habilita el sistema.');
        this.state.refresh().subscribe();
        this.load();
      },
      error: err => {
        this.sending = false;
        this.formError = errorMessage(err, 'No se pudo enviar el comprobante.');
      }
    });
  }

  async confirmLogout(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Cerrar sesión',
      message: '¿Querés salir de CondoPY?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Salir', role: 'destructive', handler: () => { this.pushSvc.unregister(); this.auth.logout(); } }
      ]
    });
    await alert.present();
  }

  private async toast(message: string): Promise<void> {
    const t = await this.toasts.create({ message, duration: 5000, position: 'top', color: 'success' });
    await t.present();
  }
}
