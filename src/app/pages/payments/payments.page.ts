import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AuthService } from '../../core/auth.service';
import { OwnerPaymentsService } from '../../core/owner-payments.service';
import { OwnerPayment, OwnerPaymentStatus } from '../../core/models';

type FilterKey = '' | OwnerPaymentStatus;

interface Filter { label: string; value: FilterKey; }

const FILTERS: Filter[] = [
  { label: 'Todos',       value: '' },
  { label: 'Pendiente',   value: 'Pending' },
  { label: 'En Revisión', value: 'UnderReview' },
  { label: 'Aprobado',    value: 'Approved' },
  { label: 'Rechazado',   value: 'Rejected' }
];

@Component({
  selector: 'app-payments',
  templateUrl: './payments.page.html',
  styleUrls: ['./payments.page.scss'],
  standalone: false
})
export class PaymentsPage {
  readonly filters = FILTERS;

  all: OwnerPayment[] = [];
  filtered: OwnerPayment[] = [];
  selectedFilter: FilterKey = '';
  loading = false;
  error = '';

  constructor(
    private svc: OwnerPaymentsService,
    private auth: AuthService,
    private navCtrl: NavController
  ) {}

  ionViewWillEnter(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.svc.getAll().subscribe({
      next: payments => {
        this.all = payments.sort(
          (a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime()
        );
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar los pagos.';
        this.loading = false;
      }
    });
  }

  refresh(event: any): void {
    this.svc.getAll().subscribe({
      next: items => {
        this.all = items.sort(
          (a, b) => new Date(b.createdAtUtc).getTime() - new Date(a.createdAtUtc).getTime()
        );
        this.applyFilter();
        event.target.complete();
      },
      error: () => { event.target.complete(); }
    });
  }

  selectFilter(value: FilterKey): void {
    this.selectedFilter = value;
    this.applyFilter();
  }

  countFor(value: FilterKey): number {
    if (!value) return 0;
    return this.all.filter(p => p.status === value).length;
  }

  goToDetail(id: string): void {
    this.navCtrl.navigateForward(`/area/payments/${id}`);
  }

  goToSubmit(): void {
    this.navCtrl.navigateForward('/area/submit-payment');
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      Pending: 'Pendiente', UnderReview: 'En Revisión',
      Approved: 'Aprobado', Rejected: 'Rechazado'
    };
    return map[status] ?? status;
  }

  statusColor(status: string): string {
    const map: Record<string, string> = {
      Pending: 'warning', UnderReview: 'primary',
      Approved: 'success', Rejected: 'danger'
    };
    return map[status] ?? 'medium';
  }

  openPdf(id: string, event: Event): void {
    event.stopPropagation();
    const token = this.auth.getToken() ?? '';
    const url = this.svc.getReceiptPdfUrl(id, token);
    window.open(url, '_blank');
  }

  fmt(value: number): string {
    return 'Gs. ' + new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(value ?? 0);
  }

  dateLabel(value: string): string {
    if (!value) return '';
    return new Intl.DateTimeFormat('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
  }

  private applyFilter(): void {
    this.filtered = this.selectedFilter
      ? this.all.filter(p => p.status === this.selectedFilter)
      : this.all;
  }
}
