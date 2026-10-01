import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, interval, of } from 'rxjs';
import { catchError, startWith, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../core/auth.service';
import { BuildingContextService } from '../../../core/building-context.service';
import { ManagerStateService } from '../../../core/manager-state.service';
import { ManagerSummary } from '../../../core/manager.models';
import { NotificationsService } from '../../../core/notifications.service';
import { PlanGateService } from '../../../core/plan-gate.service';
import { formatGs } from '../manager.util';

@Component({
  selector: 'app-manager-dashboard',
  templateUrl: './manager-dashboard.page.html',
  styleUrls: ['../manager.shared.scss', './manager-dashboard.page.scss'],
  standalone: false,
})
export class ManagerDashboardPage implements OnInit, OnDestroy {
  summary: ManagerSummary | null = null;
  loading = true;
  error = false;
  unreadCount = 0;

  readonly gs = formatGs;

  private subs = new Subscription();

  constructor(
    private auth: AuthService,
    private router: Router,
    private buildings: BuildingContextService,
    private state: ManagerStateService,
    private notifications: NotificationsService,
    private gate: PlanGateService
  ) {}

  get userName(): string { return this.auth.getUser()?.fullName ?? ''; }
  get initials(): string {
    return (this.userName || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }
  get hasBuilding(): boolean { return !!this.buildings.selectedId; }
  get readOnly(): boolean { return this.gate.readOnly; }

  // Pagos que esperan acción: por revisar + en revisión.
  get paymentsWaiting(): number {
    return (this.summary?.pendingOwnerPayments ?? 0) + (this.summary?.underReviewOwnerPayments ?? 0);
  }

  ngOnInit(): void {
    this.subs.add(this.state.summary$.subscribe(s => {
      this.summary = s;
      if (s) { this.loading = false; this.error = false; }
    }));

    // Contador de la campana: cada 30 segundos, como en la app de propietarios.
    this.subs.add(
      interval(30_000).pipe(
        startWith(0),
        switchMap(() => this.notifications.getUnreadCount().pipe(catchError(() => of({ count: 0 }))))
      ).subscribe(dto => { this.unreadCount = dto.count; })
    );
  }

  ionViewWillEnter(): void {
    this.reload();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  reload(event?: CustomEvent): void {
    if (!this.summary) this.loading = true;
    this.error = false;

    // Si todavía no se cargaron los edificios, el shell ya lo está pidiendo: se espera a que lleguen.
    this.buildings.load().pipe(
      switchMap(() => this.state.refresh())
    ).subscribe({
      next: s => {
        this.loading = false;
        this.error = !s && this.hasBuilding;
        event?.detail.complete();
      },
      error: () => {
        this.loading = false;
        this.error = true;
        event?.detail.complete();
      }
    });
  }

  // ── Aviso del plan ───────────────────────────────────────────────────────
  get planBanner(): { cls: string; icon: string; text: string } | null {
    const plan = this.summary?.plan;
    if (!plan) return null;

    switch (plan.status) {
      case 'ExpiringSoon':
        return { cls: 'warn', icon: 'time-outline',
          text: `Tu plan vence en ${plan.daysUntilExpiry} día(s). Enviá el comprobante de pago desde "Mi plan".` };
      case 'Expired':
        return { cls: 'warn', icon: 'alert-circle-outline',
          text: 'Tu plan está vencido. Enviá el comprobante de pago antes de que el sistema pase a solo lectura.' };
      case 'ReadOnly':
        return { cls: 'danger', icon: 'lock-closed-outline',
          text: `El sistema está en solo lectura por plan vencido. ${plan.daysUntilBlocked !== null ? `En ${plan.daysUntilBlocked} día(s) se bloquea todo el acceso. ` : ''}Solo podés enviar el pago.` };
      default:
        return null;
    }
  }

  go(path: string): void { void this.router.navigateByUrl(path); }
}
