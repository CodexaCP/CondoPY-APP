import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ActionSheetController, AlertController, NavController, ToastController } from '@ionic/angular';
import { concat, Observable, toArray } from 'rxjs';
import { map } from 'rxjs/operators';
import { PlanGateService } from '../../../core/plan-gate.service';
import {
  ReconciliationItemRef,
  ReconciliationMovement,
  ReconciliationWorkspace
} from '../../../core/reconciliation.models';
import { ReconciliationService } from '../../../core/reconciliation.service';
import { confirmAmount } from '../amount.util';
import { errorMessage, formatGs } from '../manager.util';
import { DayGroup, fmtDay, fmtDayShort, groupByDay, movementKey, signedGs, sourceLabel } from './finance.util';

type ReconSegment = 'pending' | 'marked';
type DirectionFilter = 'all' | 'in' | 'out';

const PAGE = 60;
const MAX_PER_REQUEST = 500;

// Conciliar una cuenta: arriba siempre se ve extracto, conciliado y diferencia; se tocan los movimientos que figuran en el extracto
// y se confirman de una vez ("Tildar N"). Cuando la diferencia es cero se puede cerrar. Cada saldo tipeado lleva confirmación.
@Component({
  selector: 'app-manager-recon',
  templateUrl: './manager-recon.page.html',
  styleUrls: ['../manager.shared.scss', './finance.shared.scss', './manager-recon.page.scss'],
  standalone: false,
})
export class ManagerReconPage {
  ws: ReconciliationWorkspace | null = null;
  loading = true;
  error = '';
  busy = false;

  segment: ReconSegment = 'pending';
  direction: DirectionFilter = 'all';
  query = '';
  visible = PAGE;

  selected = new Set<string>();

  // Lista ya filtrada y agrupada por día (se recalcula al cambiar algo; no en cada ciclo de la vista).
  groups: DayGroup[] = [];
  filteredCount = 0;
  hiddenCount = 0;
  selectedTotal = 0;

  // Hoja de "Corregir el extracto".
  editOpen = false;
  editDate = '';
  editBalance: number | null = null;
  editNotes = '';
  editError = '';
  today = '';

  readonly gs = formatGs;
  readonly day = fmtDay;
  readonly dayShort = fmtDayShort;
  readonly signed = signedGs;
  readonly source = sourceLabel;

  private id = '';

  constructor(
    private route: ActivatedRoute,
    private recon: ReconciliationService,
    private gate: PlanGateService,
    private navCtrl: NavController,
    private alerts: AlertController,
    private sheets: ActionSheetController,
    private toasts: ToastController
  ) {}

  get canEdit(): boolean { return !!this.ws?.canEdit && !this.gate.readOnly; }
  get isOpen(): boolean { return this.ws?.status === 'Open'; }
  get isPendingSegment(): boolean { return this.segment === 'pending'; }

  // Diferencia que quedaría si se confirma lo seleccionado (tildar la reduce; quitar un tilde la aumenta).
  get previewDifference(): number | null {
    if (!this.ws || this.selected.size === 0) return null;
    return this.isPendingSegment ? this.ws.difference - this.selectedTotal : this.ws.difference + this.selectedTotal;
  }

  get allSelected(): boolean { return this.filteredCount > 0 && this.selected.size >= Math.min(this.filteredCount, MAX_PER_REQUEST); }

  ionViewWillEnter(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    if (!this.id) { void this.navCtrl.navigateBack('/manager/finance'); return; }
    this.today = todayIso();
    this.load(true);
  }

  retry(): void { this.load(true); }

  refresh(event: CustomEvent): void {
    this.load(false, event);
  }

  // ── Lista ────────────────────────────────────────────────────────────────

  onSegmentChange(): void {
    this.selected.clear();
    this.visible = PAGE;
    this.recompute();
  }

  setDirection(value: DirectionFilter): void {
    this.direction = value;
    this.visible = PAGE;
    this.recompute();
  }

  onSearch(event: CustomEvent): void {
    this.query = String(event.detail?.value ?? '').trim().toLowerCase();
    this.visible = PAGE;
    this.recompute();
  }

  showMore(): void {
    this.visible += PAGE;
    this.recompute();
  }

  isSelected(m: ReconciliationMovement): boolean { return this.selected.has(movementKey(m)); }

  toggle(m: ReconciliationMovement): void {
    if (!this.canEdit || !this.isOpen || this.busy) return;
    const key = movementKey(m);
    if (this.selected.has(key)) this.selected.delete(key);
    else if (this.selected.size < MAX_PER_REQUEST) this.selected.add(key);
    else { void this.toast(`Se pueden elegir hasta ${MAX_PER_REQUEST} movimientos por vez.`, 'warning'); return; }
    this.recomputeSelection();
  }

  // Selecciona (o deselecciona) todo lo que pasa el filtro actual, hasta 500 por vez.
  toggleAll(): void {
    if (!this.canEdit || !this.isOpen || this.busy) return;
    if (this.allSelected) { this.selected.clear(); }
    else {
      this.selected.clear();
      for (const m of this.filtered().slice(0, MAX_PER_REQUEST)) this.selected.add(movementKey(m));
    }
    this.recomputeSelection();
  }

  clearSelection(): void {
    this.selected.clear();
    this.recomputeSelection();
  }

  // ── Acciones ─────────────────────────────────────────────────────────────

  async confirmSelection(): Promise<void> {
    const ws = this.ws;
    if (!ws || this.selected.size === 0 || this.busy) return;

    const items = this.selectedRefs();
    if (this.isPendingSegment) {
      this.run(this.send(items, refs => this.recon.mark(this.id, refs)), `${items.length} movimiento(s) tildado(s)`);
      return;
    }

    const alert = await this.alerts.create({
      header: 'Quitar el tilde',
      message: `Vas a quitar el tilde a ${items.length} movimiento(s). Vuelven a la lista de pendientes.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Quitar', role: 'destructive', handler: () => this.run(this.send(items, refs => this.recon.unmark(this.id, refs)), 'Tilde quitado') }
      ]
    });
    await alert.present();
  }

  async complete(): Promise<void> {
    const ws = this.ws;
    if (!ws || !ws.isBalanced || this.busy) return;

    // Confirmación adicional antes de cerrar: se vuelve a mostrar el saldo del extracto con el que se cierra.
    const ok = await confirmAmount(
      this.alerts,
      'Cerrar la conciliación',
      `${ws.accountName} · extracto al ${fmtDay(ws.statementDate)}`,
      ws.statementBalance,
      'Sí, cerrar',
      'Los movimientos tildados quedan conciliados.'
    );
    if (!ok) return;

    this.run(this.recon.complete(this.id), 'Conciliación cerrada', true);
  }

  async openMenu(): Promise<void> {
    if (!this.canEdit || !this.isOpen) return;
    const sheet = await this.sheets.create({
      header: 'Conciliación',
      buttons: [
        { text: 'Corregir fecha o saldo del extracto', icon: 'create-outline', handler: () => this.openEdit() },
        { text: 'Descartar esta conciliación', icon: 'trash-outline', role: 'destructive', handler: () => { void this.confirmDiscard(); } },
        { text: 'Cancelar', role: 'cancel' }
      ]
    });
    await sheet.present();
  }

  openEdit(): void {
    const ws = this.ws;
    if (!ws) return;
    this.editDate = ws.statementDate;
    this.editBalance = ws.statementBalance;
    this.editNotes = ws.notes ?? '';
    this.editError = '';
    this.editOpen = true;
  }

  closeEdit(): void { this.editOpen = false; }

  async saveEdit(): Promise<void> {
    const ws = this.ws;
    if (!ws) return;

    if (!this.editDate || this.editDate > this.today) { this.editError = 'Elegí la fecha del extracto (no puede ser futura).'; return; }
    if (this.editBalance === null) { this.editError = 'Escribí el saldo del extracto.'; return; }
    this.editError = '';

    const ok = await confirmAmount(
      this.alerts,
      'Confirmá el saldo del extracto',
      `${ws.accountName} · al ${fmtDay(this.editDate)}`,
      this.editBalance
    );
    if (!ok) return;

    this.busy = true;
    this.recon.update(this.id, { statementDate: this.editDate, statementBalance: this.editBalance, notes: this.editNotes.trim() || null }).subscribe({
      next: ws2 => {
        this.busy = false;
        this.editOpen = false;
        this.apply(ws2);
        void this.toast('Extracto actualizado');
      },
      error: err => {
        this.busy = false;
        this.editError = errorMessage(err, 'No se pudo actualizar el extracto.');
      }
    });
  }

  private async confirmDiscard(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Descartar conciliación',
      message: 'Se borra esta conciliación y los tildes que hiciste en ella. No toca los movimientos del libro.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Descartar', role: 'destructive', handler: () => this.doDiscard() }
      ]
    });
    await alert.present();
  }

  private doDiscard(): void {
    this.busy = true;
    this.recon.discard(this.id).subscribe({
      next: () => {
        this.busy = false;
        void this.toast('Conciliación descartada');
        void this.navCtrl.navigateBack('/manager/finance');
      },
      error: err => { this.busy = false; void this.failed(err); }
    });
  }

  // ── Armado ───────────────────────────────────────────────────────────────

  private selectedRefs(): ReconciliationItemRef[] {
    const source = this.isPendingSegment ? this.ws!.pending : this.ws!.marked;
    return source.filter(m => this.selected.has(movementKey(m))).map(m => ({ sourceType: m.sourceType, sourceId: m.sourceId }));
  }

  // Manda los movimientos en tandas de hasta 500 (el máximo del backend) y devuelve el último estado de la conciliación.
  private send(items: ReconciliationItemRef[], call: (refs: ReconciliationItemRef[]) => Observable<ReconciliationWorkspace>): Observable<ReconciliationWorkspace> {
    const chunks: Observable<ReconciliationWorkspace>[] = [];
    for (let i = 0; i < items.length; i += MAX_PER_REQUEST) chunks.push(call(items.slice(i, i + MAX_PER_REQUEST)));
    return concat(...chunks).pipe(toArray(), map(all => all[all.length - 1]));
  }

  private run(request: Observable<ReconciliationWorkspace>, okMessage: string, leave = false): void {
    this.busy = true;
    request.subscribe({
      next: ws => {
        this.busy = false;
        this.selected.clear();
        this.apply(ws);
        void this.toast(okMessage);
        if (leave) void this.navCtrl.navigateBack('/manager/finance');
      },
      error: err => {
        this.busy = false;
        void this.failed(err);
        this.load(false);
      }
    });
  }

  private load(showSpinner: boolean, event?: CustomEvent): void {
    if (showSpinner) { this.loading = true; this.ws = null; }
    this.error = '';
    this.recon.get(this.id).subscribe({
      next: ws => {
        this.loading = false;
        this.selected.clear();
        this.apply(ws);
        (event?.detail as { complete?: () => void } | undefined)?.complete?.();
      },
      error: err => {
        this.loading = false;
        this.error = errorMessage(err, 'No se pudo cargar la conciliación.');
        (event?.detail as { complete?: () => void } | undefined)?.complete?.();
      }
    });
  }

  private apply(ws: ReconciliationWorkspace): void {
    this.ws = ws;
    // Una conciliación cerrada solo se consulta: lo único que tiene sentido ver son los tildados.
    if (ws.status === 'Completed') this.segment = 'marked';
    this.recompute();
  }

  private filtered(): ReconciliationMovement[] {
    const ws = this.ws;
    if (!ws) return [];
    let list = this.isPendingSegment ? ws.pending : ws.marked;
    if (this.direction === 'in') list = list.filter(m => m.amount > 0);
    else if (this.direction === 'out') list = list.filter(m => m.amount < 0);
    if (this.query) {
      const q = this.query;
      list = list.filter(m => `${m.description} ${m.thirdParty} ${m.reference}`.toLowerCase().includes(q));
    }
    return list;
  }

  private recompute(): void {
    const list = this.filtered();
    this.filteredCount = list.length;
    this.hiddenCount = Math.max(0, list.length - this.visible);
    this.groups = groupByDay(list.slice(0, this.visible));
    this.recomputeSelection();
  }

  private recomputeSelection(): void {
    const ws = this.ws;
    const source = ws ? (this.isPendingSegment ? ws.pending : ws.marked) : [];
    this.selectedTotal = source.filter(m => this.selected.has(movementKey(m))).reduce((sum, m) => sum + m.amount, 0);
  }

  // Los 400/403/409 del backend traen el motivo exacto (mes cerrado, otra persona hizo un cambio...).
  private async failed(err: unknown): Promise<void> {
    const alert = await this.alerts.create({
      header: 'No se pudo completar',
      message: errorMessage(err, 'Ocurrió un error. Intentá de nuevo.'),
      buttons: ['Entendido']
    });
    await alert.present();
  }

  private async toast(message: string, color: 'success' | 'warning' = 'success'): Promise<void> {
    const t = await this.toasts.create({ message, duration: 2200, position: 'top', color });
    await t.present();
  }
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
