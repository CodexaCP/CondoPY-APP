import { Component, NgZone, OnDestroy } from '@angular/core';
import { NavController } from '@ionic/angular';
import { App } from '@capacitor/app';
import { PluginListenerHandle } from '@capacitor/core';
import { Subscription, switchMap, timer } from 'rxjs';
import { OnlinePaymentsService } from '../../core/online-payments.service';
import {
  OnlinePayment, OnlinePaymentBuildingOption, OnlinePaymentComprobante, OnlinePaymentConnectionOption, OnlinePaymentOptions
} from '../../core/online-payments.models';

// choose: elegir hasta qué comprobante pagar. waiting: el propietario está pagando en la página del proveedor. result: terminó (pagado, cerrado o en revisión).
type View = 'loading' | 'choose' | 'waiting' | 'result';

const POLL_MS = 5000;

const CLOSE_REASONS: Record<string, string> = {
  Expired: 'Venció el tiempo para pagar. No se te cobró nada: podés volver a intentarlo.',
  Rejected: 'El pago fue rechazado por el proveedor. No se te cobró: podés intentar con otra tarjeta.',
  Cancelled: 'El pago se canceló.',
  ProviderError: 'No se pudo iniciar el pago con el proveedor. Probá de nuevo en unos minutos.',
  Simulated: 'Era un pago de prueba: no se aplicó a tu deuda.'
};

// Pagar las expensas con tarjeta. Se elige hasta qué comprobante pagar (siempre completos, del más antiguo al más nuevo), se abre la página de pago
// del proveedor y mientras tanto esta pantalla consulta el estado hasta que el proveedor confirma. El dinero va directo al comercio del titular que
// se muestra antes de pagar: Expenses nunca toca los datos de la tarjeta.
@Component({
  selector: 'app-pay-online',
  templateUrl: './pay-online.page.html',
  styleUrls: ['./pay-online.page.scss'],
  standalone: false
})
export class PayOnlinePage implements OnDestroy {
  view: View = 'loading';
  options: OnlinePaymentOptions | null = null;
  error = '';

  // Elección
  building: OnlinePaymentBuildingOption | null = null;
  connectionId = '';
  through: OnlinePaymentComprobante | null = null;
  creating = false;

  // Pago en curso o terminado
  payment: OnlinePayment | null = null;
  checking = false;
  now = Date.now();

  private poll?: Subscription;
  private tick?: Subscription;
  private resumeListener?: PluginListenerHandle;

  constructor(private svc: OnlinePaymentsService, private navCtrl: NavController, private zone: NgZone) {}

  ionViewWillEnter(): void {
    this.listenForResume();
    this.load();
  }

  ionViewWillLeave(): void {
    this.stopPolling();
    void this.resumeListener?.remove();
    this.resumeListener = undefined;
  }

  ngOnDestroy(): void {
    this.ionViewWillLeave();
  }

  // ── Carga ────────────────────────────────────────────────────────────────

  load(): void {
    this.view = 'loading';
    this.error = '';
    this.svc.getOptions().subscribe({
      next: options => {
        this.options = options;
        this.through = null;

        // Si ya hay un pago en curso (por ejemplo la app se cerró mientras pagaba) se retoma en vez de abrir otro.
        const inProgress = options.buildings.find(b => b.openPaymentId);
        if (inProgress?.openPaymentId) {
          this.svc.getById(inProgress.openPaymentId).subscribe({
            next: payment => this.showPayment(payment),
            error: () => this.showChoose()
          });
          return;
        }

        this.showChoose();
      },
      error: err => {
        this.error = this.messageOf(err, 'No se pudieron cargar tus opciones de pago.');
        this.view = 'choose';
      }
    });
  }

  private showChoose(): void {
    this.view = 'choose';
    const buildings = this.options?.buildings ?? [];
    this.building = this.building && buildings.find(b => b.buildingId === this.building!.buildingId) || buildings[0] || null;
    this.afterBuildingChange();
  }

  selectBuilding(buildingId: string): void {
    this.building = this.options?.buildings.find(b => b.buildingId === buildingId) ?? null;
    this.afterBuildingChange();
  }

  private afterBuildingChange(): void {
    this.through = null;
    this.error = '';
    this.connectionId = this.building && this.building.connections.length === 1 ? this.building.connections[0].id : '';
  }

  // ── Elección ─────────────────────────────────────────────────────────────

  get connection(): OnlinePaymentConnectionOption | null {
    return this.building?.connections.find(c => c.id === this.connectionId) ?? null;
  }

  get canPay(): boolean {
    return !!this.building && !this.building.blockedReason && !!this.through && !!this.connectionId && !this.creating;
  }

  isCovered(c: OnlinePaymentComprobante): boolean {
    if (!this.through || !this.building) return false;
    const list = this.building.comprobantes;
    return list.indexOf(c) <= list.indexOf(this.through);
  }

  payUpTo(c: OnlinePaymentComprobante): void {
    this.through = c;
    this.error = '';
  }

  pay(): void {
    if (!this.canPay || !this.building || !this.through) return;

    this.creating = true;
    this.error = '';
    this.svc.create({
      buildingId: this.building.buildingId,
      connectionId: this.connectionId,
      throughUnitId: this.through.unitId,
      throughExpensePeriodId: this.through.expensePeriodId
    }).subscribe({
      next: payment => {
        this.creating = false;
        this.showPayment(payment);
        this.openCheckout();
      },
      error: err => {
        this.creating = false;
        this.error = this.messageOf(err, 'No se pudo iniciar el pago.');
        // Si ya había un pago en curso, la lista de opciones lo trae: se vuelve a cargar para retomarlo.
        if (err?.error?.error === 'payment_in_progress') this.load();
      }
    });
  }

  // ── Pago en curso ────────────────────────────────────────────────────────

  private showPayment(payment: OnlinePayment): void {
    this.payment = payment;
    if (payment.status === 'Open') {
      this.view = 'waiting';
      this.startPolling(payment.id);
    } else {
      this.view = 'result';
      this.stopPolling();
    }
  }

  // Abre la página de pago del proveedor en el navegador del teléfono. Los datos de la tarjeta se escriben ahí, nunca en esta app.
  openCheckout(): void {
    const url = this.payment?.checkoutUrl;
    if (url) window.open(url, '_system');
  }

  private startPolling(id: string): void {
    this.stopPolling();
    this.tick = timer(1000, 1000).subscribe(() => { this.now = Date.now(); });
    this.poll = timer(POLL_MS, POLL_MS).pipe(switchMap(() => this.svc.getById(id))).subscribe({
      next: payment => this.zone.run(() => this.showPayment(payment)),
      error: () => { /* sin conexión por un momento: se reintenta en el próximo ciclo */ }
    });
  }

  private stopPolling(): void {
    this.poll?.unsubscribe();
    this.tick?.unsubscribe();
    this.poll = undefined;
    this.tick = undefined;
  }

  // «Ya pagué»: consulta el estado ahora en vez de esperar el próximo ciclo.
  checkNow(): void {
    if (!this.payment || this.checking) return;
    this.checking = true;
    this.svc.getById(this.payment.id).subscribe({
      next: payment => { this.checking = false; this.showPayment(payment); },
      error: () => { this.checking = false; }
    });
  }

  // Al volver a la app desde la página de pago se consulta el estado enseguida.
  private listenForResume(): void {
    if (this.resumeListener) return;
    App.addListener('appStateChange', state => {
      if (state.isActive && this.view === 'waiting') this.zone.run(() => this.checkNow());
    }).then(handle => (this.resumeListener = handle)).catch(() => { /* navegador: sin listener nativo */ });
  }

  get secondsLeft(): number {
    const expires = this.payment?.expiresAtUtc ? new Date(this.payment.expiresAtUtc).getTime() : 0;
    return Math.max(0, Math.floor((expires - this.now) / 1000));
  }

  get countdown(): string {
    const total = this.secondsLeft;
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  // ── Resultado ────────────────────────────────────────────────────────────

  get closeMessage(): string {
    return CLOSE_REASONS[this.payment?.closeReason ?? ''] ?? 'El pago se cerró sin cobrarse.';
  }

  retry(): void {
    this.payment = null;
    this.load();
  }

  goToReceipt(): void {
    if (this.payment?.ownerPaymentId) this.navCtrl.navigateForward(`/area/payments/${this.payment.ownerPaymentId}`);
  }

  goToPayments(): void {
    this.navCtrl.navigateBack('/area/payments');
  }

  fmt(value: number): string {
    return 'Gs. ' + new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(value ?? 0);
  }

  period(month: number, year: number): string {
    return `${String(month).padStart(2, '0')}/${year}`;
  }

  private messageOf(err: any, fallback: string): string {
    const body = err?.error;
    return (typeof body === 'string' ? body : body?.message) ?? fallback;
  }
}
