import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, filter, map } from 'rxjs/operators';
import { BuildingContextService } from '../../core/building-context.service';
import { ManagerStateService } from '../../core/manager-state.service';
import { ManagerSummary } from '../../core/manager.models';
import { PlanGateService } from '../../core/plan-gate.service';

// Shell de la sección del Encargado: barra de pestañas con contadores. Con el plan bloqueado se oculta la barra
// y solo queda la pantalla de "Mi plan".
@Component({
  selector: 'app-manager',
  templateUrl: './manager.page.html',
  standalone: false,
})
export class ManagerPage implements OnInit, OnDestroy {
  summary$ = this.state.summary$;
  blocked$ = this.gate.blocked$;

  private sub = new Subscription();

  constructor(
    private buildings: BuildingContextService,
    private state: ManagerStateService,
    private gate: PlanGateService
  ) {}

  ngOnInit(): void {
    // Cada vez que cambia el edificio seleccionado se vuelve a pedir el resumen.
    this.sub.add(
      this.buildings.selected$.pipe(
        map(b => b?.id ?? null),
        filter((id): id is string => !!id),
        distinctUntilChanged()
      ).subscribe(() => this.state.refresh().subscribe())
    );

    // La lista de edificios se carga una vez. Si todo el acceso está bloqueado por plan, el interceptor
    // ya lleva a "Mi plan".
    this.sub.add(this.buildings.load().subscribe({ error: () => { /* lo muestran las pantallas */ } }));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  // Pagos que esperan al Encargado: por revisar + en revisión.
  paymentsCount(summary: ManagerSummary | null): number {
    return summary ? summary.pendingOwnerPayments + summary.underReviewOwnerPayments : 0;
  }
}
