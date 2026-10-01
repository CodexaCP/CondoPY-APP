import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, map, skip } from 'rxjs/operators';
import { BuildingContextService } from '../../../core/building-context.service';
import { resolveUploadUrl } from '../../../core/file-url.util';
import { ManagerApiService } from '../../../core/manager-api.service';
import { ManagerStateService } from '../../../core/manager-state.service';
import { AmenityReservation } from '../../../core/models';
import { PlanGateService } from '../../../core/plan-gate.service';
import { errorMessage, fmtDateTime, fmtRange, formatGs, isPdf } from '../manager.util';

type ReservationSegment = 'review' | 'confirmed' | 'closed';

const SEGMENT_STATUSES: Record<ReservationSegment, string[]> = {
  review: ['PendingPayment', 'PendingReview'],
  confirmed: ['Confirmed'],
  closed: ['Rejected', 'Cancelled']
};

@Component({
  selector: 'app-manager-reservations',
  templateUrl: './manager-reservations.page.html',
  styleUrls: ['../manager.shared.scss', './manager-reservations.page.scss'],
  standalone: false,
})
export class ManagerReservationsPage implements OnInit, OnDestroy {
  segment: ReservationSegment = 'review';
  all: AmenityReservation[] = [];
  loading = true;
  error = '';
  selected: AmenityReservation | null = null;
  acting = false;

  readonly gs = formatGs;
  readonly range = fmtRange;
  readonly dateTime = fmtDateTime;

  private sub = new Subscription();
  private seq = 0;

  constructor(
    private api: ManagerApiService,
    private buildings: BuildingContextService,
    private state: ManagerStateService,
    private gate: PlanGateService,
    private alerts: AlertController,
    private toasts: ToastController
  ) {}

  get readOnly(): boolean { return this.gate.readOnly; }

  // Se pide todo el edificio y se filtra acá: "por revisar" junta dos estados del backend.
  get items(): AmenityReservation[] {
    const statuses = SEGMENT_STATUSES[this.segment];
    return this.all
      .filter(r => statuses.includes(r.status))
      .sort((a, b) => this.segment === 'review'
        ? new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
        : new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
  }

  count(segment: ReservationSegment): number {
    const statuses = SEGMENT_STATUSES[segment];
    return this.all.filter(r => statuses.includes(r.status)).length;
  }

  get canReview(): boolean {
    const s = this.selected?.status;
    return !this.readOnly && (s === 'PendingPayment' || s === 'PendingReview');
  }

  get comprobante(): string { return resolveUploadUrl(this.selected?.comprobanteUrl); }
  get comprobanteIsPdf(): boolean { return isPdf(this.selected?.comprobanteUrl); }

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
    this.state.refresh().subscribe();
    this.load(true, event);
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'PendingPayment': return 'Falta el pago';
      case 'PendingReview': return 'Por revisar';
      case 'Confirmed': return 'Confirmada';
      case 'Rejected': return 'Rechazada';
      case 'Cancelled': return 'Cancelada';
      default: return status;
    }
  }

  statusClass(status: string): string {
    switch (status) {
      case 'PendingPayment': return 'warn';
      case 'PendingReview': return 'info';
      case 'Confirmed': return 'ok';
      case 'Rejected': return 'danger';
      default: return 'muted';
    }
  }

  open(r: AmenityReservation): void { this.selected = r; }
  close(): void { this.selected = null; }

  openPdf(): void { window.open(this.comprobante, '_system'); }

  async approve(): Promise<void> {
    const r = this.selected;
    if (!r) return;

    const alert = await this.alerts.create({
      header: 'Aprobar reserva',
      message: `Se confirma "${r.amenityName}" ${this.range(r.startsAt, r.endsAt)} y se avisa a ${r.reservedByName}. ` +
               'Además se publica un comunicado de que el área queda reservada en ese horario.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Aprobar', handler: () => this.review(r, true) }
      ]
    });
    await alert.present();
  }

  async reject(): Promise<void> {
    const r = this.selected;
    if (!r) return;

    const alert = await this.alerts.create({
      header: 'Rechazar reserva',
      message: 'Podés indicar un motivo (opcional). Se le envía al residente.',
      inputs: [{ name: 'reason', type: 'textarea', placeholder: 'Motivo (opcional)', attributes: { maxlength: 300 } }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Rechazar', role: 'destructive', handler: (data: { reason?: string }) => this.review(r, false, data.reason) }
      ]
    });
    await alert.present();
  }

  private review(r: AmenityReservation, approve: boolean, reason?: string): void {
    this.acting = true;
    this.api.reviewReservation(r.id, approve, reason).subscribe({
      next: () => {
        this.acting = false;
        this.selected = null;
        void this.toast(approve ? 'Reserva confirmada' : 'Reserva rechazada');
        this.state.refresh().subscribe();
        this.load(true);
      },
      error: async err => {
        this.acting = false;
        const alert = await this.alerts.create({
          header: 'No se pudo completar',
          message: errorMessage(err, 'Ocurrió un error. Intentá de nuevo.'),
          buttons: ['Entendido']
        });
        await alert.present();
        // "La reserva ya fue procesada": se recarga para mostrar el estado real.
        this.selected = null;
        this.load(true);
      }
    });
  }

  load(silent = false, event?: CustomEvent): void {
    const buildingId = this.buildings.selectedId;
    if (!buildingId) { this.loading = false; event?.detail.complete(); return; }

    if (!silent) { this.loading = true; this.all = []; }
    this.error = '';

    const mine = ++this.seq;
    this.api.getReservations(buildingId).subscribe({
      next: list => {
        event?.detail.complete();
        if (mine !== this.seq) return;
        this.all = list;
        this.loading = false;
      },
      error: err => {
        event?.detail.complete();
        if (mine !== this.seq) return;
        this.loading = false;
        this.error = errorMessage(err, 'No se pudieron cargar las reservas.');
      }
    });
  }

  private async toast(message: string): Promise<void> {
    const t = await this.toasts.create({ message, duration: 2500, position: 'top', color: 'success' });
    await t.present();
  }
}
