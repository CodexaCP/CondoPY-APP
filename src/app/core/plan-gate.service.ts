import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ManagerPlanStatus = 'Active' | 'ExpiringSoon' | 'Expired' | 'ReadOnly' | 'Blocked' | 'Archived';

// Estado de restricción por plan vencido, compartido por toda la sección del Encargado.
//  - readOnly: se puede consultar pero no modificar (los botones de acción se deshabilitan).
//  - blocked:  solo queda la pantalla de "Mi plan" para enviar el comprobante de pago.
// Lo alimentan el interceptor (cuando la API responde 403 plan_*) y las pantallas que leen el plan.
// El backend es quien manda: esto solo evita ofrecer botones que van a fallar.
@Injectable({ providedIn: 'root' })
export class PlanGateService {
  private readonly readOnlySubject = new BehaviorSubject<boolean>(false);
  private readonly blockedSubject = new BehaviorSubject<boolean>(false);

  readonly readOnly$ = this.readOnlySubject.asObservable();
  readonly blocked$ = this.blockedSubject.asObservable();

  get readOnly(): boolean { return this.readOnlySubject.value || this.blockedSubject.value; }
  get blocked(): boolean { return this.blockedSubject.value; }

  applyStatus(status: ManagerPlanStatus | string | null | undefined): void {
    this.readOnlySubject.next(status === 'ReadOnly' || status === 'Blocked');
    this.blockedSubject.next(status === 'Blocked');
  }

  markReadOnly(): void { this.readOnlySubject.next(true); }
  markBlocked(): void { this.blockedSubject.next(true); this.readOnlySubject.next(true); }
  reset(): void { this.applyStatus('Active'); }
}
