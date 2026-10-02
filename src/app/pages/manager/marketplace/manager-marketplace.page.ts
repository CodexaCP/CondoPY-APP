import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, NavController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, map, skip } from 'rxjs/operators';
import { BuildingContextService } from '../../../core/building-context.service';
import { resolveUploadUrl } from '../../../core/file-url.util';
import { ManagerStateService } from '../../../core/manager-state.service';
import { MarketplaceService } from '../../../core/marketplace.service';
import { MarketplaceReviewItem } from '../../../core/marketplace.models';
import { PlanGateService } from '../../../core/plan-gate.service';
import { errorMessage, fmtDateTime, fmtRange, formatGs, isPdf } from '../manager.util';

// Revisión de los pagos de reservas del Marketplace: el Encargado ve el comprobante y confirma o rechaza.
@Component({
  selector: 'app-manager-marketplace',
  templateUrl: './manager-marketplace.page.html',
  styleUrls: ['../manager.shared.scss', './manager-marketplace.page.scss'],
  standalone: false,
})
export class ManagerMarketplacePage implements OnInit, OnDestroy {
  items: MarketplaceReviewItem[] = [];
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
    if (this.buildings.selectedId) this.load(true);
  }

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

    if (!silent) { this.loading = true; this.items = []; }
    this.error = '';

    const mine = ++this.seq;
    this.market.pendingPayments(buildingId).subscribe({
      next: list => {
        event?.detail.complete();
        if (mine !== this.seq) return;
        this.items = list;
        this.loading = false;
      },
      error: err => {
        event?.detail.complete();
        if (mine !== this.seq) return;
        this.loading = false;
        this.error = errorMessage(err, 'No se pudieron cargar los pagos del Marketplace.');
      }
    });
  }

  private async toast(message: string, color: 'success' | 'warning'): Promise<void> {
    const t = await this.toasts.create({ message, duration: 2800, position: 'top', color });
    await t.present();
  }
}
