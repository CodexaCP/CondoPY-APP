import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, NavController, ToastController } from '@ionic/angular';
import { Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, map, skip } from 'rxjs/operators';
import { AuthService } from '../../../core/auth.service';
import { BuildingContextService } from '../../../core/building-context.service';
import { resolveUploadUrl } from '../../../core/file-url.util';
import { ManagerStateService } from '../../../core/manager-state.service';
import { MarketplaceService } from '../../../core/marketplace.service';
import { MarketplaceClaim, MarketplaceClaimResolution, MarketplaceHandoverNote, MarketplaceRefund, MarketplaceReviewItem } from '../../../core/marketplace.models';
import { PlanGateService } from '../../../core/plan-gate.service';
import { errorMessage, fmtDateTime, fmtRange, formatGs, isPdf } from '../manager.util';

// Marketplace del Encargado: revisa los pagos de reservas (ve el comprobante y confirma o rechaza), devuelve los reembolsos a los
// compradores (fuera del sistema; acá los marca "devueltos") y resuelve los reclamos ("Reportar un problema").
@Component({
  selector: 'app-manager-marketplace',
  templateUrl: './manager-marketplace.page.html',
  styleUrls: ['../manager.shared.scss', './manager-marketplace.page.scss'],
  standalone: false,
})
export class ManagerMarketplacePage implements OnInit, OnDestroy {
  segment: 'payments' | 'refunds' | 'claims' | 'notes' = 'payments';
  notes: MarketplaceHandoverNote[] = [];
  note: MarketplaceHandoverNote | null = null;
  items: MarketplaceReviewItem[] = [];
  refunds: MarketplaceRefund[] = [];
  claims: MarketplaceClaim[] = [];
  claim: MarketplaceClaim | null = null;
  loading = true;
  error = '';
  selected: MarketplaceReviewItem | null = null;
  acting = false;

  readonly gs = formatGs;
  readonly range = fmtRange;
  readonly dateTime = fmtDateTime;

  private sub = new Subscription();
  private seq = 0;

  constructor(
    private route: ActivatedRoute,
    private auth: AuthService,
    private market: MarketplaceService,
    private buildings: BuildingContextService,
    private state: ManagerStateService,
    private gate: PlanGateService,
    private alerts: AlertController,
    private toasts: ToastController,
    private navCtrl: NavController
  ) {}

  get readOnly(): boolean { return this.gate.readOnly; }

  get comprobante(): string { return resolveUploadUrl(this.selected?.comprobanteUrl); }
  get comprobanteIsPdf(): boolean { return isPdf(this.selected?.comprobanteUrl); }

  // Solo se confirma mientras la reserva no haya terminado; rechazar se puede siempre.
  get canApprove(): boolean { return !this.readOnly && !!this.selected && !this.selected.reservationEnded; }
  get canReject(): boolean { return !this.readOnly && !!this.selected; }

  ngOnInit(): void {
    this.sub.add(
      this.buildings.selected$.pipe(skip(1), map(b => b?.id ?? null), distinctUntilChanged())
        .subscribe(id => { if (id) this.load(); })
    );
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  ionViewWillEnter(): void {
    // Un aviso trae la solapa (reembolsos o reclamos).
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'refunds' || tab === 'claims' || tab === 'payments' || tab === 'notes') this.segment = tab;
    if (this.buildings.selectedId) this.load(true);
  }

  onSegmentChange(): void { this.load(); }

  refresh(event: CustomEvent): void {
    this.load(true, event);
  }

  open(item: MarketplaceReviewItem): void { this.selected = item; }
  close(): void { this.selected = null; }
  openPdf(): void { window.open(this.comprobante, '_system'); }
  goBack(): void { this.navCtrl.back(); }

  async approve(): Promise<void> {
    const item = this.selected;
    if (!item) return;

    const alert = await this.alerts.create({
      header: 'Confirmar pago',
      message: `Confirmá que el comprobante muestra exactamente ${this.gs(item.expectedAmount)}. ` +
               `Se confirma la reserva de ${item.title} y se avisa a ${item.buyerName}.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Sí, confirmar', handler: () => this.run(item, this.market.approvePayment(item.paymentId, item.expectedAmount), 'Pago confirmado') }
      ]
    });
    await alert.present();
  }

  async reject(): Promise<void> {
    const item = this.selected;
    if (!item) return;

    const alert = await this.alerts.create({
      header: 'Rechazar pago',
      message: 'Se cierra la reserva y el horario queda libre. El motivo se le envía al comprador.',
      inputs: [{ name: 'reason', type: 'textarea', placeholder: 'Motivo (obligatorio)', attributes: { maxlength: 500 } }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Rechazar',
          role: 'destructive',
          handler: (data: { reason?: string }) => {
            const reason = (data.reason ?? '').trim();
            if (!reason) {
              void this.toast('Escribí el motivo del rechazo.', 'warning');
              return false;
            }
            this.run(item, this.market.rejectPayment(item.paymentId, reason), 'Pago rechazado');
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  private run(item: MarketplaceReviewItem, call: ReturnType<MarketplaceService['approvePayment']>, okMessage: string): void {
    this.acting = true;
    call.subscribe({
      next: () => {
        this.acting = false;
        this.selected = null;
        void this.toast(okMessage, 'success');
        this.items = this.items.filter(x => x.paymentId !== item.paymentId);
        this.state.refresh().subscribe();
      },
      error: async err => {
        this.acting = false;
        const alert = await this.alerts.create({
          header: 'No se pudo completar',
          message: errorMessage(err, 'Ocurrió un error. Intentá de nuevo.'),
          buttons: ['Entendido']
        });
        await alert.present();
        // Por ejemplo "este pago ya fue revisado": se recarga para mostrar el estado real.
        this.selected = null;
        this.load(true);
      }
    });
  }

  load(silent = false, event?: CustomEvent): void {
    const buildingId = this.buildings.selectedId;
    if (!buildingId) { this.loading = false; event?.detail.complete(); return; }

    if (!silent) { this.loading = true; }
    this.error = '';

    const mine = ++this.seq;
    const ok = <T>(apply: (list: T) => void) => (list: T) => {
      event?.detail.complete();
      if (mine !== this.seq) return;
      apply(list);
      this.loading = false;
    };
    const fail = (fallback: string) => (err: unknown) => {
      event?.detail.complete();
      if (mine !== this.seq) return;
      this.loading = false;
      this.error = errorMessage(err, fallback);
    };

    if (this.segment === 'payments') {
      this.market.pendingPayments(buildingId).subscribe({
        next: ok(list => { this.items = list; }),
        error: fail('No se pudieron cargar los pagos del Marketplace.')
      });
    } else if (this.segment === 'refunds') {
      this.market.refunds(buildingId).subscribe({
        next: ok(list => { this.refunds = list; }),
        error: fail('No se pudieron cargar los reembolsos.')
      });
    } else if (this.segment === 'claims') {
      this.market.claims(buildingId).subscribe({
        next: ok(list => { this.claims = list; }),
        error: fail('No se pudieron cargar los reclamos.')
      });
    } else {
      this.market.handoverNotes(buildingId).subscribe({
        next: ok(list => { this.notes = list; }),
        error: fail('No se pudieron cargar las notas de cambio de propietario.')
      });
    }
  }

  // ── Reembolsos ───────────────────────────────────────────────────────────

  originLabel(origin: MarketplaceRefund['origin']): string {
    switch (origin) {
      case 'BuyerCancellation': return 'Canceló el comprador (se devuelve el precio; la comisión no)';
      case 'OwnerCancellation': return 'Canceló el propietario (se devuelve todo)';
      default:                  return 'Reclamo resuelto a favor del comprador (se devuelve todo)';
    }
  }

  async markReturned(refund: MarketplaceRefund): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Marcar como devuelto',
      message: `Confirmá que ya le devolviste ${this.gs(refund.amount)} a ${refund.buyerName} por la reserva ${refund.reference}. ` +
               'Queda registrado quién y cuándo.',
      buttons: [
        { text: 'Volver', role: 'cancel' },
        { text: 'Sí, ya lo devolví', handler: () => this.runAction(this.market.markRefundReturned(refund.id), 'Reembolso marcado como devuelto') }
      ]
    });
    await alert.present();
  }

  // ── Cambios de propietario principal ─────────────────────────────────────

  // Abrir la nota la marca como leída (la primera vez) y trae la situación actual de cada operación.
  openNote(n: MarketplaceHandoverNote): void {
    this.market.handoverNote(n.id).subscribe({
      next: opened => { this.note = opened; },
      error: err => { void this.toast(errorMessage(err, 'No se pudo abrir la nota.'), 'warning'); }
    });
  }

  closeNote(): void {
    this.note = null;
    this.load(true);
  }

  notePdf(): void {
    if (!this.note) return;
    window.open(this.market.handoverPdfUrl(this.note.id, this.auth.getToken() ?? ''), '_system');
  }

  opStatus(status: string, credit: string, claim: boolean, refund: string | null): string {
    const base: Record<string, string> = { InReview: 'Pago en revisión', Confirmed: 'Confirmada', Completed: 'Finalizada', Cancelled: 'Cancelada' };
    const creditLabel: Record<string, string> = { Pending: 'acreditación pendiente', Held: 'acreditación retenida', Credited: 'acreditada', Reversed: 'acreditación revertida' };
    const extra = [creditLabel[credit], claim ? 'reclamo abierto' : '', refund === 'Pending' ? 'reembolso pendiente' : refund === 'Returned' ? 'reembolso devuelto' : ''].filter(Boolean);
    return (base[status] ?? status) + (extra.length ? ' (' + extra.join(', ') + ')' : '');
  }

  // ── Reclamos ─────────────────────────────────────────────────────────────

  openClaim(c: MarketplaceClaim): void { this.claim = c; }
  closeClaim(): void { this.claim = null; }

  async resolveClaim(outcome: MarketplaceClaimResolution): Promise<void> {
    const c = this.claim;
    if (!c) return;

    const favorBuyer = outcome === 'InFavorOfBuyer';
    const alert = await this.alerts.create({
      header: favorBuyer ? 'A favor del comprador' : 'A favor del propietario',
      message: favorBuyer
        ? `Se le devuelve todo (${this.gs(c.totalAmount)}) a ${c.buyerName}. El propietario no cobra y asume la comisión (${this.gs(c.commissionAmount)}): ` +
          'se le descuenta de su saldo a favor o queda como deuda por gestión.'
        : `No se devuelve nada. La ganancia del propietario (${this.gs(c.baseAmount)}) se acredita a su saldo a favor normalmente.`,
      inputs: [{ name: 'note', type: 'textarea', placeholder: 'Explicación para las dos partes (obligatoria)', attributes: { maxlength: 500 } }],
      buttons: [
        { text: 'Volver', role: 'cancel' },
        {
          text: 'Resolver',
          handler: (data: { note?: string }) => {
            const note = (data.note ?? '').trim();
            if (!note) {
              void this.toast('Escribí una explicación: la ven las dos partes.', 'warning');
              return false;
            }
            this.runAction(this.market.resolveClaim(c.id, outcome, note), 'Reclamo resuelto');
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  // Reembolsos y reclamos: al terminar se recarga la lista (y los contadores del Encargado).
  private runAction(call: Observable<unknown>, okMessage: string): void {
    this.acting = true;
    call.subscribe({
      next: () => {
        this.acting = false;
        this.claim = null;
        void this.toast(okMessage, 'success');
        this.load(true);
        this.state.refresh().subscribe();
      },
      error: async err => {
        this.acting = false;
        const alert = await this.alerts.create({
          header: 'No se pudo completar',
          message: errorMessage(err, 'Ocurrió un error. Intentá de nuevo.'),
          buttons: ['Entendido']
        });
        await alert.present();
        // Por ejemplo "este reclamo ya fue resuelto": se recarga para mostrar el estado real.
        this.claim = null;
        this.load(true);
      }
    });
  }

  private async toast(message: string, color: 'success' | 'warning'): Promise<void> {
    const t = await this.toasts.create({ message, duration: 2800, position: 'top', color });
    await t.present();
  }
}
