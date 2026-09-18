import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';
import { AccountService } from '../../core/account.service';
import {
  MyUnit,
  AccountStatementPeriod,
  AccountStatementDetail,
  AccountStatementPayment
} from '../../core/models';

type AccountView = 'periods' | 'payments';

interface UnifiedPaymentHistoryItem extends AccountStatementPayment {
  expensePeriodId: string;
  expensePeriodName: string;
  year: number;
  month: number;
}

interface ConsolidatedPeriodItem extends AccountStatementPeriod {
  unitId: string;
  unitCode: string;
  buildingName: string;
  condominiumName: string;
}

@Component({
  selector: 'app-account',
  templateUrl: './account.page.html',
  styleUrls: ['./account.page.scss'],
  standalone: false,
})
export class AccountPage {
  units: MyUnit[] = [];
  selectedUnit: MyUnit | null = null;
  detailUnit: MyUnit | null = null;
  periods: AccountStatementPeriod[] = [];
  consolidatedPeriods: ConsolidatedPeriodItem[] = [];
  activeView: AccountView = 'periods';
  consolidatedMode = false;
  selectedPeriod: AccountStatementPeriod | null = null;
  detail: AccountStatementDetail | null = null;
  loading = false;
  loadingPayments = false;
  paymentHistory: UnifiedPaymentHistoryItem[] = [];
  detailAdjExpanded = false;
  detailPaymentsExpanded = true;

  get detailNonAdjCharges() { return this.detail?.charges.filter(c => c.chargeType !== 'Adjustment') ?? []; }
  get detailAdjCharges()    { return this.detail?.charges.filter(c => c.chargeType === 'Adjustment') ?? []; }
  get detailAdjTotal()      { return this.detailAdjCharges.reduce((s, c) => s + c.amount, 0); }

  get receiptUrl(): string {
    if (!this.detailUnit || !this.selectedPeriod) return '';
    return this.accountSvc.getReceiptPdfUrl(
      this.detailUnit.unitId, this.selectedPeriod.expensePeriodId, this.auth.getToken() ?? ''
    );
  }

  get settlementUrl(): string {
    if (!this.selectedPeriod) return '';
    return this.accountSvc.getSettlementPdfUrl(this.selectedPeriod.expensePeriodId, this.auth.getToken() ?? '');
  }

  get unitTotalDebt(): number {
    return Math.max(this.periods[0]?.runningBalance ?? 0, 0);
  }

  get consolidatedTotalDebt(): number {
    return this.units.reduce((sum, unit) => {
      const latest = this.findLatestPeriodForUnit(unit.unitId);
      return sum + (latest ? Math.max(latest.runningBalance, 0) : 0);
    }, 0);
  }

  constructor(
    private auth: AuthService,
    private accountSvc: AccountService,
    private router: Router
  ) {}

  ionViewWillEnter(): void {
    const navUnit = history.state?.unit as MyUnit | undefined;
    const consolidated = !!history.state?.consolidated;
    const targetPeriodId = history.state?.expensePeriodId as string | undefined;

    if (this.units.length === 0) {
      this.auth.getMyUnits().subscribe({
        next: (units) => {
          this.units = units;

          if (consolidated && units.length > 1) {
            this.activateConsolidatedMode();
            return;
          }

          this.consolidatedMode = false;
          this.selectUnit(navUnit ?? units[0], targetPeriodId);
        }
      });
      return;
    }

    if (consolidated && this.units.length > 1) {
      this.activateConsolidatedMode();
      return;
    }

    if (navUnit && navUnit.unitId !== this.selectedUnit?.unitId) {
      this.consolidatedMode = false;
      this.selectUnit(navUnit, targetPeriodId);
    } else if (targetPeriodId) {
      this.refreshCurrentUnit(targetPeriodId);
    } else if (this.consolidatedMode) {
      this.refreshConsolidatedPeriods();
    } else if (this.selectedUnit) {
      this.refreshCurrentUnit();
    }
  }

  selectUnit(unit: MyUnit, targetPeriodId?: string): void {
    if (!unit) return;

    this.consolidatedMode = false;
    this.selectedUnit = unit;
    this.detailUnit = unit;
    this.selectedPeriod = null;
    this.detail = null;
    this.periods = [];
    this.consolidatedPeriods = [];
    this.paymentHistory = [];
    this.loadingPayments = false;
    this.loading = true;

    this.accountSvc.getPeriods(unit.unitId).subscribe({
      next: (periods) => {
        this.periods = periods.sort((a, b) => b.year - a.year || b.month - a.month);
        this.loading = false;

        if (targetPeriodId) {
          const match = this.periods.find(p => p.expensePeriodId === targetPeriodId);
          if (match) this.openDetail(match);
        } else if (this.activeView === 'payments') {
          this.loadPaymentHistory();
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  activateConsolidatedMode(): void {
    this.consolidatedMode = true;
    this.selectedUnit = null;
    this.detailUnit = null;
    this.selectedPeriod = null;
    this.detail = null;
    this.periods = [];
    this.paymentHistory = [];
    this.loadingPayments = false;
    this.activeView = 'periods';
    this.refreshConsolidatedPeriods();
  }

  exitConsolidatedMode(): void {
    if (this.units.length === 0) return;
    this.selectUnit(this.units[0]);
  }

  setView(view: AccountView): void {
    if (this.activeView === view) return;

    this.activeView = view;
    if (view === 'payments' && this.selectedUnit && this.paymentHistory.length === 0 && !this.loading) {
      this.loadPaymentHistory();
    }
  }

  openDetail(period: AccountStatementPeriod): void {
    if (!this.selectedUnit) return;

    this.detailUnit = this.selectedUnit;
    this.selectedPeriod = period;
    this.detail = null;
    this.detailAdjExpanded = false;
    this.detailPaymentsExpanded = true;
    this.accountSvc.getPeriodDetail(this.selectedUnit.unitId, period.expensePeriodId).subscribe({
      next: (detail) => {
        this.detail = detail;
      }
    });
  }

  openConsolidatedDetail(period: ConsolidatedPeriodItem): void {
    const unit = this.units.find((item) => item.unitId === period.unitId);
    if (!unit) return;

    this.detailUnit = unit;
    this.selectedPeriod = period;
    this.detail = null;
    this.detailAdjExpanded = false;
    this.detailPaymentsExpanded = true;
    this.accountSvc.getPeriodDetail(unit.unitId, period.expensePeriodId).subscribe({
      next: (detail) => {
        this.detail = detail;
      }
    });
  }

  refresh(event: any): void {
    if (this.consolidatedMode) {
      this.refreshConsolidatedPeriods();
    } else {
      this.refreshCurrentUnit();
    }

    setTimeout(() => event.target.complete(), 800);
  }

  goHome(): void {
    this.router.navigateByUrl('/home');
  }

  fmt(value: number): string {
    return 'Gs. ' + new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(value ?? 0);
  }

  monthLabel(month: number): string {
    return ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][month] ?? '';
  }

  chargeTypeLabel(type: string): string {
    const map: Record<string, string> = {
      Ordinary: 'Ordinaria',
      ReserveFund: 'Fondo reserva',
      Extraordinary: 'Extraordinario',
      Individual: 'Individual',
      Adjustment: 'Ajuste'
    };
    return map[type] ?? type;
  }

  methodLabel(method: string): string {
    const map: Record<string, string> = {
      Cash: 'Efectivo',
      BankTransfer: 'Transferencia',
      Card: 'Tarjeta',
      Check: 'Cheque',
      Other: 'Otro'
    };
    return map[method] ?? method;
  }

  dateLabel(value: string | null | undefined): string {
    if (!value) return 'Sin fecha';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  private refreshCurrentUnit(targetPeriodId?: string): void {
    if (!this.selectedUnit) return;

    this.loading = true;
    this.accountSvc.getPeriods(this.selectedUnit.unitId).subscribe({
      next: (periods) => {
        this.periods = periods.sort((a, b) => b.year - a.year || b.month - a.month);
        this.loading = false;

        if (targetPeriodId) {
          const match = this.periods.find(p => p.expensePeriodId === targetPeriodId);
          if (match) this.openDetail(match);
        } else if (this.activeView === 'payments') {
          this.loadPaymentHistory();
        }
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private refreshConsolidatedPeriods(): void {
    if (this.units.length === 0) return;

    this.loading = true;
    this.consolidatedPeriods = [];

    const requests = this.units.map((unit) =>
      this.accountSvc.getPeriods(unit.unitId).pipe(catchError(() => of([] as AccountStatementPeriod[])))
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        const merged = results.reduce<ConsolidatedPeriodItem[]>((acc, periods, index) => {
          const unit = this.units[index];
          const mapped = periods.map((period) => ({
            ...period,
            unitId: unit.unitId,
            unitCode: unit.unitCode,
            buildingName: unit.buildingName,
            condominiumName: unit.condominiumName
          }));

          return acc.concat(mapped);
        }, []);

        this.consolidatedPeriods = merged.sort((a, b) => {
          const yearDiff = b.year - a.year;
          if (yearDiff !== 0) return yearDiff;

          const monthDiff = b.month - a.month;
          if (monthDiff !== 0) return monthDiff;

          return a.unitCode.localeCompare(b.unitCode);
        });

        this.loading = false;
      },
      error: () => {
        this.consolidatedPeriods = [];
        this.loading = false;
      }
    });
  }

  private loadPaymentHistory(): void {
    if (!this.selectedUnit) return;
    if (this.periods.length === 0) {
      this.paymentHistory = [];
      return;
    }

    this.loadingPayments = true;

    const requests = this.periods.map((period) =>
      this.accountSvc.getPeriodDetail(this.selectedUnit!.unitId, period.expensePeriodId).pipe(
        catchError(() => of(null as AccountStatementDetail | null))
      )
    );

    forkJoin(requests).subscribe({
      next: (details) => {
        const normalizedDetails = details.filter(
          (detail): detail is AccountStatementDetail => detail !== null
        );

        const payments = normalizedDetails.reduce<UnifiedPaymentHistoryItem[]>((acc, detail) => {
          const mappedPayments = detail.payments.map((payment: AccountStatementPayment) => ({
            ...payment,
            expensePeriodId: detail.expensePeriodId,
            expensePeriodName: detail.expensePeriodName,
            year: detail.year,
            month: detail.month
          }));

          return acc.concat(mappedPayments);
        }, []);

        this.paymentHistory = payments.sort(
          (a: UnifiedPaymentHistoryItem, b: UnifiedPaymentHistoryItem) =>
            new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
        );

        this.loadingPayments = false;
      },
      error: () => {
        this.paymentHistory = [];
        this.loadingPayments = false;
      }
    });
  }

  private findLatestPeriodForUnit(unitId: string): ConsolidatedPeriodItem | undefined {
    return this.consolidatedPeriods.find((period) => period.unitId === unitId);
  }
}
