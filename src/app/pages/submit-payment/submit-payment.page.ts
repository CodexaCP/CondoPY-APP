import { Component, ViewChild, ElementRef } from '@angular/core';
import { NavController } from '@ionic/angular';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';
import { OwnerPaymentsService } from '../../core/owner-payments.service';
import { UploadService } from '../../core/upload.service';
import { MyUnit, OwnerDebtCharge, OwnerDebtUnit } from '../../core/models';

interface AllocationRow {
  unitCode: string;
  concept: string;
  period: string;
  amount: number;
  covered: boolean;
  selected: boolean;
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
  existingCredit = 0;

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
    if (this.options.length === 0) {
      this.load();
    } else {
      // Unidad cargada — solo resetear selección
      this.options.forEach(o => { o.selected = this.options.length === 1; });
    }
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
        this.existingCredit = credit.amount ?? 0;
        this.options = units.map(unit => ({
          unit,
          debt: debts.find(d => d.unitId === unit.unitId) ?? null,
          selected: units.length === 1
        }));
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudieron cargar tus unidades.';
        this.loading = false;
      }
    });
  }

  get selectedUnitIds(): string[] {
    return this.options.filter(o => o.selected).map(o => o.unit.unitId);
  }

  get totalDebtSelected(): number {
    return this.options
      .filter(o => o.selected && o.debt)
      .reduce((sum, o) => sum + (o.debt?.totalDebt ?? 0), 0);
  }

  toggle(opt: UnitOption): void {
    opt.selected = !opt.selected;
  }

  // Lista de todas las deudas (más antigua primero). Si hay monto, simula la regla
  // del servidor al aprobar: solo cargos completos y el sobrante queda como crédito.
  get allocationPreview(): { rows: AllocationRow[]; leftover: number } {
    const hasAmount = !!this.declaredAmount;
    let available = hasAmount ? (this.declaredAmount ?? 0) + this.existingCredit : 0;

    const all = this.options
      .filter(o => o.debt)
      .reduce((acc, o) => acc.concat(o.debt!.charges.map(c => ({ c, unitCode: o.unit.unitCode, selected: o.selected }))),
        [] as { c: OwnerDebtCharge; unitCode: string; selected: boolean }[])
      .sort((a, b) =>
        a.c.periodYear - b.c.periodYear ||
        a.c.periodMonth - b.c.periodMonth ||
        b.c.amount - a.c.amount);

    const rows: AllocationRow[] = all.map(({ c, unitCode, selected }) => {
      let covered = false;
      if (hasAmount && selected && available >= c.pendingAmount) {
        covered = true;
        available -= c.pendingAmount;
      }
      return {
        unitCode,
        concept: c.concept,
        period: `${String(c.periodMonth).padStart(2, '0')}/${c.periodYear}`,
        amount: c.pendingAmount,
        covered,
        selected
      };
    });
    return { rows, leftover: hasAmount ? available : 0 };
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
