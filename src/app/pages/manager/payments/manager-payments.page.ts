import { Component, OnDestroy, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, map, skip } from 'rxjs/operators';
import { BuildingContextService } from '../../../core/building-context.service';
import { ManagerApiService } from '../../../core/manager-api.service';
import { ManagerStateService } from '../../../core/manager-state.service';
import { ManagerOwnerPayment } from '../../../core/manager.models';
import { errorMessage, fmtDate, formatGs } from '../manager.util';

type PaymentSegment = 'pending' | 'review' | 'done';

const SEGMENT_STATUSES: Record<PaymentSegment, string[]> = {
  pending: ['Pending'],
  review: ['UnderReview'],
  done: ['Approved', 'Rejected']
};

const PAGE_SIZE = 25;

@Component({
  selector: 'app-manager-payments',
  templateUrl: './manager-payments.page.html',
  styleUrls: ['../manager.shared.scss', './manager-payments.page.scss'],
  standalone: false,
})
export class ManagerPaymentsPage implements OnInit, OnDestroy {
  segment: PaymentSegment = 'pending';
  items: ManagerOwnerPayment[] = [];
  total = 0;
  page = 1;
  loading = true;
  error = '';

  readonly gs = formatGs;
  readonly date = fmtDate;

  private sub = new Subscription();

  constructor(
    private api: ManagerApiService,
    private buildings: BuildingContextService,
    private state: ManagerStateService,
    private navCtrl: NavController
  ) {}

  get hasMore(): boolean { return this.items.length < this.total; }

  ngOnInit(): void {
    // Al cambiar de edificio se vuelve a cargar la lista (skip(1): la primera carga la hace ionViewWillEnter).
    this.sub.add(
      this.buildings.selected$.pipe(skip(1), map(b => b?.id ?? null), distinctUntilChanged())
        .subscribe(id => { if (id) this.load(true); })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  // Al volver desde el detalle la lista se refresca (el pago ya cambió de estado).
  ionViewWillEnter(): void {
    if (this.buildings.selectedId) this.load(true, undefined, true);
  }

  // ion-segment avisa también al armarse con el valor inicial: solo se recarga si el segmento cambió de verdad.
  private lastSegment: PaymentSegment = this.segment;

  onSegmentChange(): void {
    if (this.segment === this.lastSegment) return;
    this.lastSegment = this.segment;
    this.load(true);
  }

  retry(): void { this.load(true); }

  refresh(event: CustomEvent): void {
    this.state.refresh().subscribe();
    this.load(true, event);
  }

  loadMore(event: CustomEvent): void {
    this.page += 1;
    this.fetch(false, event);
  }

  open(payment: ManagerOwnerPayment): void {
    void this.navCtrl.navigateForward(`/manager/payments/${payment.id}`);
  }

  units(payment: ManagerOwnerPayment): string {
    return payment.units.map(u => u.unitCode).join(', ') || '—';
  }

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

  private load(reset: boolean, event?: CustomEvent, silent = false): void {
    if (reset) {
      this.page = 1;
      if (!silent) { this.loading = true; this.items = []; }
    }
    this.error = '';
    this.fetch(reset, event);
  }

  // Solo vale la respuesta del último pedido (al abrir la pantalla puede salir más de uno a la vez).
  private seq = 0;

  private fetch(reset: boolean, event?: CustomEvent): void {
    const buildingId = this.buildings.selectedId;
    if (!buildingId) { this.loading = false; this.complete(event); return; }

    const mine = ++this.seq;
    this.api.getPayments(buildingId, SEGMENT_STATUSES[this.segment], this.page, PAGE_SIZE).subscribe({
      next: res => {
        this.complete(event);
        if (mine !== this.seq) return;
        this.items = reset ? res.items : [...this.items, ...res.items];
        this.total = res.total;
        this.loading = false;
      },
      error: err => {
        this.complete(event);
        if (mine !== this.seq) return;
        this.loading = false;
        this.error = errorMessage(err, 'No se pudieron cargar los pagos.');
      }
    });
  }

  // El refresher completa por event.detail; el scroll infinito, por event.target.
  private complete(event?: CustomEvent): void {
    if (!event) return;
    const detail = event.detail as { complete?: () => void } | null;
    const target = event.target as { complete?: () => void } | null;
    (detail?.complete ?? target?.complete)?.call(detail?.complete ? detail : target);
  }
}
