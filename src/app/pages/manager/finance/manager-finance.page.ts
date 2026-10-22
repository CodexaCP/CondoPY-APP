import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, NavController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, map, skip } from 'rxjs/operators';
import { BuildingContextService } from '../../../core/building-context.service';
import { PlanGateService } from '../../../core/plan-gate.service';
import {
  ReconciliationAccount,
  ReconciliationOverview,
  ReconciliationSummary
} from '../../../core/reconciliation.models';
import { ReconciliationLightInfo, ReconciliationService } from '../../../core/reconciliation.service';
import { confirmAmount } from '../amount.util';
import { errorMessage, fmtDateTime, formatGs } from '../manager.util';
import { fmtDay } from './finance.util';

type FinanceSegment = 'accounts' | 'history';

// "Caja y bancos": las cuentas del edificio que se concilian con el extracto, con un semáforo de cuán al día está cada una,
// y el historial de conciliaciones cerradas. Empezar una conciliación pide la fecha y el saldo del extracto (con confirmación).
@Component({
  selector: 'app-manager-finance',
  templateUrl: './manager-finance.page.html',
  styleUrls: ['../manager.shared.scss', './finance.shared.scss', './manager-finance.page.scss'],
  standalone: false,
})
export class ManagerFinancePage implements OnInit, OnDestroy {
  segment: FinanceSegment = 'accounts';
  overview: ReconciliationOverview | null = null;
  history: ReconciliationSummary[] = [];
  loading = true;
  error = '';

  // Hoja de "Empezar conciliación".
  startFor: ReconciliationAccount | null = null;
  statementDate = '';
  statementBalance: number | null = null;
  notes = '';
  formError = '';
  starting = false;
  today = '';

  readonly gs = formatGs;
  readonly day = fmtDay;
  readonly dateTime = fmtDateTime;

  private sub = new Subscription();
  private seq = 0;

  constructor(
    private recon: ReconciliationService,
    private buildings: BuildingContextService,
    private gate: PlanGateService,
    private navCtrl: NavController,
    private alerts: AlertController,
    private toasts: ToastController
  ) {}

  get readOnly(): boolean { return this.gate.readOnly; }
  get canEdit(): boolean { return !!this.overview?.canEdit && !this.readOnly; }

  ngOnInit(): void {
    // Al cambiar de edificio se vuelve a cargar (skip(1): la primera carga la hace ionViewWillEnter).
    this.sub.add(
      this.buildings.selected$.pipe(skip(1), map(b => b?.id ?? null), distinctUntilChanged())
        .subscribe(id => { if (id) this.load(true); })
    );
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  // Al volver de una conciliación las tarjetas se refrescan sin parpadeo.
  ionViewWillEnter(): void {
    if (this.buildings.selectedId) this.load(!this.overview);
  }

  refresh(event: CustomEvent): void {
    this.load(false, event);
  }

  retry(): void { this.load(true); }

  light(account: ReconciliationAccount): ReconciliationLightInfo { return this.recon.lightOf(account); }

  typeLabel(account: ReconciliationAccount): string {
    switch (account.accountType) {
      case 'Cash': return 'Caja';
      case 'ReserveFund': return 'Fondo de reserva';
      case 'Bank': return 'Banco';
      default: return 'Cuenta';
    }
  }

  // ── Acciones ─────────────────────────────────────────────────────────────

  continueOpen(account: ReconciliationAccount): void {
    if (account.openReconciliationId) void this.navCtrl.navigateForward(`/manager/finance/${account.openReconciliationId}`);
  }

  openHistory(item: ReconciliationSummary): void {
    void this.navCtrl.navigateForward(`/manager/finance/${item.id}`);
  }

  openStart(account: ReconciliationAccount): void {
    this.startFor = account;
    this.today = todayIso();
    this.statementDate = this.today;
    this.statementBalance = null;
    this.notes = '';
    this.formError = '';
  }

  closeStart(): void { this.startFor = null; }

  // El día mínimo del corte es el siguiente al de la última conciliación cerrada de la cuenta.
  minDate(account: ReconciliationAccount | null): string {
    if (!account?.lastCompletedDate) return '';
    const [y, m, d] = account.lastCompletedDate.split('-').map(Number);
    const next = new Date(y, (m || 1) - 1, (d || 1) + 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
  }

  async start(): Promise<void> {
    const account = this.startFor;
    const buildingId = this.buildings.selectedId;
    if (!account || !buildingId) return;

    if (!this.statementDate || this.statementDate > this.today) { this.formError = 'Elegí la fecha del extracto (no puede ser futura).'; return; }
    if (this.statementBalance === null) { this.formError = 'Escribí el saldo que dice el extracto a esa fecha.'; return; }
    this.formError = '';

    // Confirmación adicional: el saldo es un dato tipeado que decide toda la conciliación.
    const ok = await confirmAmount(
      this.alerts,
      'Confirmá el saldo del extracto',
      `${account.accountName} · al ${fmtDay(this.statementDate)}`,
      this.statementBalance
    );
    if (!ok) return;

    this.starting = true;
    this.recon.start({
      buildingId, accountId: account.accountId, statementDate: this.statementDate,
      statementBalance: this.statementBalance, notes: this.notes.trim() || null
    }).subscribe({
      next: ws => {
        this.starting = false;
        this.startFor = null;
        void this.navCtrl.navigateForward(`/manager/finance/${ws.id}`);
      },
      error: err => {
        this.starting = false;
        this.formError = errorMessage(err, 'No se pudo empezar la conciliación.');
      }
    });
  }

  // ── Carga ────────────────────────────────────────────────────────────────

  private load(showSpinner: boolean, event?: CustomEvent): void {
    const buildingId = this.buildings.selectedId;
    if (!buildingId) { this.loading = false; this.complete(event); return; }

    if (showSpinner) { this.loading = true; this.overview = null; this.history = []; }
    this.error = '';
    const mine = ++this.seq;

    this.recon.getOverview(buildingId).subscribe({
      next: overview => {
        if (mine !== this.seq) { this.complete(event); return; }
        this.overview = overview;
        this.recon.getHistory(buildingId).subscribe({
          next: history => {
            if (mine !== this.seq) { this.complete(event); return; }
            this.history = history;
            this.loading = false;
            this.complete(event);
          },
          error: () => { this.loading = false; this.complete(event); }
        });
      },
      error: err => {
        this.complete(event);
        if (mine !== this.seq) return;
        this.loading = false;
        this.overview = null;
        this.error = errorMessage(err, 'No se pudo cargar Caja y bancos.');
      }
    });
  }

  private complete(event?: CustomEvent): void {
    (event?.detail as { complete?: () => void } | undefined)?.complete?.();
  }
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
