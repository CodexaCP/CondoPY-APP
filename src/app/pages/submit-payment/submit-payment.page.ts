import { Component, ViewChild, ElementRef } from '@angular/core';
import { NavController } from '@ionic/angular';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';
import { OwnerPaymentsService } from '../../core/owner-payments.service';
import { UploadService } from '../../core/upload.service';
import { MyUnit, OwnerDebtUnit } from '../../core/models';

interface ComprobanteLine {
  concept: string;
  amount: number;
}

// Comprobante = todo lo pendiente de una unidad en un periodo. Se paga completo o no se paga.
interface ComprobanteRow {
  key: string;
  unitCode: string;
  buildingName: string;
  year: number;
  month: number;
  period: string;
  lines: ComprobanteLine[];
  total: number;
  cumulative: number;
  // Lo que hay que transferir hasta este comprobante, ya descontado el saldo a favor disponible.
  netCumulative: number;
  covered: boolean;
}

interface UnitOption {
  unit: MyUnit;
  debt: OwnerDebtUnit | null;
  selected: boolean;
}

@Component({
  selector: 'app-submit-payment',
  templateUrl: './submit-payment.page.html',
  styleUrls: ['./submit-payment.page.scss'],
  standalone: false
})
export class SubmitPaymentPage {
  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;
  options: UnitOption[] = [];
  declaredAmount: number | null = null;
  amountDisplay = '';
  // Se descuenta solo, el propietario nunca lo elige — ver GetMyDebt/CoverWithCredit en el backend.
  availableCredit = 0;

  // Comprobante — imagen seleccionada localmente
  comprobanteFile: File | null = null;
  comprobantePreview: string | null = null;

  loading = false;
  saving = false;
  error = '';

  // Fecha del día — no editable, se envía al servidor como paymentDate
  readonly today = new Date();
  readonly todayStr = this.today.toISOString().split('T')[0];
  readonly todayDisplay = new Intl.DateTimeFormat('es-PY', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  }).format(this.today);

  constructor(
    private auth: AuthService,
    private svc: OwnerPaymentsService,
    private uploadSvc: UploadService,
    private navCtrl: NavController
  ) {}

  ionViewWillEnter(): void {
    this.resetForm();
    // Siempre se vuelve a consultar: la deuda cambia al publicarse un periodo o aprobarse un pago.
    this.load();
  }

  private resetForm(): void {
    this.declaredAmount     = null;
    this.amountDisplay      = '';
    this.comprobanteFile    = null;
    this.comprobantePreview = null;
    this.error              = '';
    this.saving             = false;
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  load(): void {
    this.loading = true;
    this.error = '';

    forkJoin({
      units: this.auth.getMyUnits(),
      debts: this.svc.getMyDebts().pipe(catchError(() => of([] as OwnerDebtUnit[]))),
      credit: this.svc.getMyCredit().pipe(catchError(() => of({ amount: 0 })))
    }).subscribe({
      next: ({ units, debts, credit }) => {
        this.options = units.map(unit => ({
          unit,
          debt: debts.find(d => d.unitId === unit.unitId) ?? null,
          selected: units.length === 1
        }));
        this.availableCredit = credit.amount;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar tus unidades.';
        this.loading = false;
      }
    });
  }

  get selectedUnitIds(): string[] {
    return this.options.map(o => o.unit.unitId);
  }

  get totalDebtSelected(): number {
    return this.options
      .filter(o => o.debt)
      .reduce((sum, o) => sum + (o.debt?.totalDebt ?? 0), 0);
  }

  toggle(opt: UnitOption): void {
    opt.selected = !opt.selected;
  }

  private expandedComprobantes = new Set<string>();

  // Comprobantes pendientes de todas las unidades, del más antiguo al más nuevo. Cada uno se paga
  // completo: los únicos montos válidos son los acumulados (1º, 1º+2º, ...). Sin pagos parciales.
  get comprobantes(): ComprobanteRow[] {
    const map = new Map<string, ComprobanteRow>();

    for (const option of this.options) {
      for (const charge of option.debt?.charges ?? []) {
        const key = `${option.unit.unitId}|${charge.periodYear}-${charge.periodMonth}`;
        let row = map.get(key);
        if (!row) {
          row = {
            key,
            unitCode: option.unit.unitCode,
            buildingName: option.unit.buildingName ?? '',
            year: charge.periodYear,
            month: charge.periodMonth,
            period: `${String(charge.periodMonth).padStart(2, '0')}/${charge.periodYear}`,
            lines: [],
            total: 0,
            cumulative: 0,
            netCumulative: 0,
            covered: false
          };
          map.set(key, row);
        }
        row.lines.push({ concept: charge.concept, amount: charge.pendingAmount });
        row.total += charge.pendingAmount;
      }
    }

    const rows = [...map.values()].sort((a, b) =>
      a.year - b.year ||
      a.month - b.month ||
      a.buildingName.localeCompare(b.buildingName, undefined, { sensitivity: 'base' }) ||
      a.unitCode.localeCompare(b.unitCode, undefined, { sensitivity: 'base' }));

    const paying = this.declaredAmount ?? 0;
    let running = 0;
    for (const row of rows) {
      row.lines = this.collapseLateFees(row.lines);
      running += row.total;
      row.cumulative = running;
      row.netCumulative = Math.max(0, running - this.availableCredit);
      // "Cubierto" compara contra lo que realmente se transfiere (ya con el credito descontado).
      row.covered = paying > 0 && paying + this.availableCredit >= running - 0.5;
    }
    return rows;
  }

  // Las moras diarias se muestran en una sola línea: "Mora 0.66% (diario) por un total de N días".
  private collapseLateFees(lines: ComprobanteLine[]): ComprobanteLine[] {
    const result: ComprobanteLine[] = [];
    const groups = new Map<string, { line: ComprobanteLine; count: number; rate: string; freq: string }>();

    for (const line of lines) {
      const match = /^Mora\s+([\d.,]+%)\s*\(([^)]+)\)/i.exec(line.concept ?? '');
      if (!match) { result.push({ ...line }); continue; }

      const key = `${match[1]}|${match[2].trim()}`.toLowerCase();
      const group = groups.get(key);
      if (group) {
        group.line.amount += line.amount;
        group.count++;
      } else {
        const merged = { concept: '', amount: line.amount };
        groups.set(key, { line: merged, count: 1, rate: match[1], freq: match[2].trim() });
        result.push(merged);
      }
    }

    const units: Record<string, string[]> = { diario: ['día', 'días'], semanal: ['semana', 'semanas'], quincenal: ['quincena', 'quincenas'] };
    groups.forEach(g => {
      const unit = units[g.freq.toLowerCase()] ?? ['intervalo', 'intervalos'];
      g.line.concept = `Mora ${g.rate} (${g.freq}) por un total de ${g.count} ${g.count === 1 ? unit[0] : unit[1]}`;
    });
    return result;
  }

  // El monto es válido solo si, sumado al saldo a favor disponible, es exactamente la suma de
  // comprobantes completos (del más antiguo en adelante).
  get coverage(): { exact: boolean; count: number } {
    const amount = this.declaredAmount ?? 0;
    const total = amount + this.availableCredit;
    const index = amount > 0 ? this.comprobantes.findIndex(c => Math.abs(c.cumulative - total) < 0.5) : -1;
    return { exact: index >= 0, count: index + 1 };
  }

  isComprobanteExpanded(key: string): boolean {
    return this.expandedComprobantes.has(key);
  }

  toggleComprobante(key: string): void {
    if (!this.expandedComprobantes.delete(key)) this.expandedComprobantes.add(key);
  }

  // Completa el monto con lo que hay que transferir hasta este comprobante (ya con el saldo a
  // favor descontado, si hay — el propietario nunca elige aplicarlo, ya viene restado).
  payUpTo(row: ComprobanteRow): void {
    this.declaredAmount = Math.round(row.netCumulative);
    this.amountDisplay = new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(this.declaredAmount);
    this.error = '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      this.error = 'El archivo no debe superar 10 MB.';
      return;
    }

    this.comprobanteFile = file;
    this.error = '';

    const reader = new FileReader();
    reader.onload = () => { this.comprobantePreview = reader.result as string; };
    reader.readAsDataURL(file);
  }

  onAmountInput(event: any): void {
    const raw = (event.target.value as string).replace(/\D/g, '');
    if (!raw) {
      this.declaredAmount = null;
      this.amountDisplay = '';
      event.target.value = '';
      return;
    }
    const num = parseInt(raw, 10);
    this.declaredAmount = num;
    const formatted = new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(num);
    this.amountDisplay = formatted;
    event.target.value = formatted;
  }

  removeComprobante(): void {
    this.comprobanteFile = null;
    this.comprobantePreview = null;
  }

  submit(): void {
    this.error = '';

    if (this.selectedUnitIds.length === 0) {
      this.error = 'Seleccioná al menos una unidad.';
      return;
    }
    if (!this.declaredAmount || this.declaredAmount <= 0) {
      this.error = 'El monto debe ser mayor a cero.';
      return;
    }
    if (!this.coverage.exact) {
      this.error = 'El pago debe cubrir comprobantes completos. Usá "Pagar hasta aquí" para completar el monto exacto.';
      return;
    }

    this.saving = true;

    const file = this.comprobanteFile;
    const upload$ = file
      ? this.uploadSvc.uploadImage(file)
      : of(null as string | null);

    upload$.pipe(
      switchMap(url => this.svc.submit({
        unitIds: this.selectedUnitIds,
        paymentDate: this.todayStr,
        declaredAmount: this.declaredAmount!,
        comprobanteUrl: url
      })),
      finalize(() => this.saving = false)
    ).subscribe({
      next: () => { this.navCtrl.navigateBack('/area/payments'); },
      error: err => {
        const body = err?.error;
        this.error = (typeof body === 'string' ? body : body?.message) ?? 'No se pudo enviar el pago.';
      }
    });
  }

  fmt(value: number): string {
    return 'Gs. ' + new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(value);
  }
}
