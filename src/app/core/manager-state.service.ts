import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize, shareReplay, tap } from 'rxjs/operators';
import { BuildingContextService } from './building-context.service';
import { ManagerApiService } from './manager-api.service';
import { ManagerSummary } from './manager.models';
import { PlanGateService } from './plan-gate.service';

// Resumen del edificio seleccionado, compartido entre el inicio y las pestañas (los contadores de la barra
// inferior salen de acá). Se refresca al cambiar de edificio, al volver a una pantalla y después de actuar.
@Injectable({ providedIn: 'root' })
export class ManagerStateService {
  private readonly summarySubject = new BehaviorSubject<ManagerSummary | null>(null);
  readonly summary$ = this.summarySubject.asObservable();

  constructor(
    private api: ManagerApiService,
    private buildings: BuildingContextService,
    private gate: PlanGateService
  ) {}

  get summary(): ManagerSummary | null { return this.summarySubject.value; }

  private inflight: { id: string; request$: Observable<ManagerSummary | null> } | null = null;

  // Devuelve el resumen (o null si falla o no hay edificio). Los errores 403 de plan los maneja el interceptor.
  // Varios pedidos a la vez para el mismo edificio comparten una sola llamada.
  refresh(): Observable<ManagerSummary | null> {
    const id = this.buildings.selectedId;
    if (!id) {
      this.summarySubject.next(null);
      return of(null);
    }

    if (this.inflight?.id === id) return this.inflight.request$;

    const request$ = this.api.getSummary(id).pipe(
      tap(summary => {
        this.summarySubject.next(summary);
        this.gate.applyStatus(summary.plan?.status ?? 'Active');
      }),
      catchError(() => of(null)),
      finalize(() => { if (this.inflight?.request$ === request$) this.inflight = null; }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.inflight = { id, request$ };
    return request$;
  }

  clear(): void {
    this.summarySubject.next(null);
    this.gate.reset();
  }
}
