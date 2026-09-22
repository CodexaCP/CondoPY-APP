import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';
import { AccountService } from '../../core/account.service';
import { AccountStatementPeriod, MyUnit } from '../../core/models';

export interface UnitDebtInfo {
  totalDebt: number;
  status: 'ok' | 'warn' | 'danger';
  lastPeriodLabel: string;
}

@Component({
  selector: 'app-units',
  templateUrl: './units.page.html',
  styleUrls: ['./units.page.scss'],
  standalone: false,
})
export class UnitsPage {
  units: MyUnit[] = [];
  debtInfo: Record<string, UnitDebtInfo> = {};
  loading = true;

  constructor(
    private auth: AuthService,
    private accountSvc: AccountService,
    private router: Router
  ) {}

  get hasMultipleUnits(): boolean {
    return this.units.length > 1;
  }

  get loadedDebtCount(): number {
    return Object.keys(this.debtInfo).length;
  }

  get summaryReady(): boolean {
    return this.hasMultipleUnits && this.loadedDebtCount === this.units.length;
  }

  get totalDebtAllUnits(): number {
    return this.units.reduce((sum, unit) => sum + (this.debtInfo[unit.unitId]?.totalDebt ?? 0), 0);
  }

  get unitsUpToDateCount(): number {
    return this.units.filter((unit) => (this.debtInfo[unit.unitId]?.totalDebt ?? 0) <= 0).length;
  }

  get unitsWithDebtCount(): number {
    return this.units.filter((unit) => (this.debtInfo[unit.unitId]?.totalDebt ?? 0) > 0).length;
  }

  // Se vuelve a pedir en cada entrada (no solo si units esta vacio): si el vinculo unidad-usuario
  // cambio mientras la app seguia abierta, la lista en memoria quedaba desactualizada.
  ionViewWillEnter(): void {
    this.loadUnits();
  }

  loadUnits(): void {
    this.loading = true;
    this.auth.getMyUnits().subscribe({
      next: (units) => {
        this.units = units;
        this.loading = false;
        this.loadDebtInfo(units);
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private loadDebtInfo(units: MyUnit[]): void {
    if (!units.length) return;

    this.debtInfo = {};

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const calls = units.map((unit) =>
      this.accountSvc.getPeriods(unit.unitId).pipe(catchError(() => of([] as AccountStatementPeriod[])))
    );

    forkJoin(calls).subscribe((results) => {
      results.forEach((periods, index) => {
        const unit = units[index];
        const withDebt = periods.filter((period) => period.balance > 0 || period.runningBalance > 0);
        const sorted = [...periods].sort((a, b) => b.year - a.year || b.month - a.month);
        const totalDebt = sorted.length > 0 ? Math.max(sorted[0].runningBalance, 0) : 0;
        const latest = sorted.length > 0 ? sorted[0] : null;
        const lastPeriodLabel = latest ? `${this.monthLabel(latest.month)} ${latest.year}` : '';

        let status: 'ok' | 'warn' | 'danger' = 'ok';
        if (withDebt.length > 0) {
          const hasOld = withDebt.some(
            (period) => period.year < currentYear || (period.year === currentYear && period.month < currentMonth)
          );
          status = hasOld ? 'danger' : 'warn';
        }

        this.debtInfo[unit.unitId] = { totalDebt, status, lastPeriodLabel };
      });
    });
  }

  refresh(event: any): void {
    this.units = [];
    this.debtInfo = {};
    this.loadUnits();
    setTimeout(() => event.target.complete(), 1000);
  }

  goToAccount(unit: MyUnit): void {
    this.router.navigateByUrl('/area/account', { state: { unit } });
  }

  goToConsolidatedAccount(): void {
    this.router.navigateByUrl('/area/account', { state: { consolidated: true } });
  }

  fmt(value: number): string {
    return 'Gs. ' + new Intl.NumberFormat('es-PY', { maximumFractionDigits: 0 }).format(value ?? 0);
  }

  private monthLabel(month: number): string {
    return ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][month] ?? '';
  }
}
