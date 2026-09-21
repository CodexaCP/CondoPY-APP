import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { OwnerPaymentsService } from '../../core/owner-payments.service';
import { OwnerPayment, OwnerPaymentApplication, OwnerPaymentInvoice } from '../../core/models';

type ApplicationItem =
  | { kind: 'row'; app: OwnerPaymentApplication }
  | { kind: 'group'; key: string; unitCode: string; period: string; apps: OwnerPaymentApplication[]; total: number; label: string };

@Component({
  selector: 'app-payment-detail',
  templateUrl: './payment-detail.page.html',
  styleUrls: ['./payment-detail.page.scss'],
  standalone: false
})
export class PaymentDetailPage {
  payment: OwnerPayment | null = null;
  invoices: OwnerPaymentInvoice[] = [];
  loading = false;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private svc: OwnerPaymentsService,
    private auth: AuthService,
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
      next: p => {
        this.payment = p;
        this.loading = false;
        this.loadInvoices(p);
      },
      error: () => { this.error = 'No se pudo cargar el pago.'; this.loading = false; }
    });
  }

  // Facturas emitidas a partir de este pago (solo existen cuando el pago fue aprobado y facturado).
  private loadInvoices(p: OwnerPayment): void {
    this.invoices = [];
    if (p.status !== 'Approved') return;
    this.svc.getInvoices(p.id).pipe(catchError(() => of([] as OwnerPaymentInvoice[])))
      .subscribe(list => { this.invoices = list; });
  }

  openInvoice(invoice: OwnerPaymentInvoice): void {
    const url = this.svc.getInvoicePdfUrl(invoice.id, this.auth.getToken() ?? '');
    window.open(url, '_blank');
  }

  back(): void { this.navCtrl.back(); }

  private expandedGroups = new Set<string>();

  // "Se aplicó a": las moras de una misma unidad y periodo se muestran en una sola línea comprimida
  // ("Mora 0.66% (diario) por un total de 12 días") que se puede expandir para ver el detalle.
  get applicationItems(): ApplicationItem[] {
    const items: ApplicationItem[] = [];
    const groups = new Map<string, Extract<ApplicationItem, { kind: 'group' }>>();

    for (const app of this.payment?.applications ?? []) {
      const match = /^Mora\s+([\d.,]+%)\s*\(([^)]+)\)/i.exec(app.concept ?? '');
      if (!match) { items.push({ kind: 'row', app }); continue; }

      const period = `${String(app.periodMonth).padStart(2, '0')}/${app.periodYear}`;
      const key = `${app.unitCode}|${period}|${match[1]}|${match[2].trim()}`.toLowerCase();
      let group = groups.get(key);
      if (!group) {
        group = { kind: 'group', key, unitCode: app.unitCode, period, apps: [], total: 0, label: '' };
        groups.set(key, group);
        items.push(group);
      }
      group.apps.push(app);
      group.total += app.amount;
      const units: Record<string, string[]> = { diario: ['día', 'días'], semanal: ['semana', 'semanas'], quincenal: ['quincena', 'quincenas'] };
      const unit = units[match[2].trim().toLowerCase()] ?? ['intervalo', 'intervalos'];
      group.label = `Mora ${match[1]} (${match[2].trim()}) por un total de ${group.apps.length} ${group.apps.length === 1 ? unit[0] : unit[1]}`;
    }
    return items;
  }

  isGroupExpanded(key: string): boolean {
    return this.expandedGroups.has(key);
  }

  toggleGroup(key: string): void {
    if (!this.expandedGroups.delete(key)) this.expandedGroups.add(key);
  }

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
