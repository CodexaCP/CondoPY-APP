import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ReconciliationAccount,
  ReconciliationItemRef,
  ReconciliationOverview,
  ReconciliationSummary,
  ReconciliationWorkspace,
  StartReconciliationRequest,
  UpdateReconciliationRequest
} from './reconciliation.models';

export type ReconciliationLight = 'ok' | 'warn' | 'danger';

export interface ReconciliationLightInfo {
  light: ReconciliationLight;
  text: string;
}

// Conciliación bancaria desde el celular. La ven los roles administrativos; armar, cerrar y descartar lo puede hacer el Encargado
// solo si el edificio lo habilitó (overview.canEdit). Un edificio sin Finanzas responde 403/409 con el motivo.
@Injectable({ providedIn: 'root' })
export class ReconciliationService {
  private readonly base = `${environment.apiUrl}/finance/reconciliation`;

  constructor(private http: HttpClient) {}

  getOverview(buildingId: string): Observable<ReconciliationOverview> {
    return this.http.get<ReconciliationOverview>(this.base, { params: new HttpParams().set('buildingId', buildingId) });
  }

  getHistory(buildingId: string, accountId?: string): Observable<ReconciliationSummary[]> {
    let params = new HttpParams().set('buildingId', buildingId);
    if (accountId) params = params.set('accountId', accountId);
    return this.http.get<ReconciliationSummary[]>(`${this.base}/history`, { params });
  }

  get(id: string): Observable<ReconciliationWorkspace> {
    return this.http.get<ReconciliationWorkspace>(`${this.base}/${id}`);
  }

  start(request: StartReconciliationRequest): Observable<ReconciliationWorkspace> {
    return this.http.post<ReconciliationWorkspace>(this.base, request);
  }

  update(id: string, request: UpdateReconciliationRequest): Observable<ReconciliationWorkspace> {
    return this.http.put<ReconciliationWorkspace>(`${this.base}/${id}`, request);
  }

  discard(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  mark(id: string, items: ReconciliationItemRef[]): Observable<ReconciliationWorkspace> {
    return this.http.post<ReconciliationWorkspace>(`${this.base}/${id}/mark`, { items });
  }

  unmark(id: string, items: ReconciliationItemRef[]): Observable<ReconciliationWorkspace> {
    return this.http.post<ReconciliationWorkspace>(`${this.base}/${id}/unmark`, { items });
  }

  complete(id: string): Observable<ReconciliationWorkspace> {
    return this.http.post<ReconciliationWorkspace>(`${this.base}/${id}/complete`, {});
  }

  // Semáforo de una cuenta: verde hasta 31 días desde la última conciliación cerrada, amarillo hasta 60, rojo si pasó o nunca se concilió.
  // Una conciliación empezada y sin cerrar se muestra amarilla ("en curso").
  lightOf(account: ReconciliationAccount, today = new Date()): ReconciliationLightInfo {
    if (account.openReconciliationId) {
      return { light: 'warn', text: 'Conciliación en curso' };
    }
    if (!account.lastCompletedDate) {
      return { light: 'danger', text: 'Todavía no se concilió' };
    }

    const days = daysSince(account.lastCompletedDate, today);
    const text = days <= 0 ? 'Conciliada hoy' : days === 1 ? 'Conciliada ayer' : `Conciliada hace ${days} días`;
    return { light: days <= 31 ? 'ok' : days <= 60 ? 'warn' : 'danger', text };
  }

  // El peor semáforo de todas las cuentas, para la tarjeta del inicio.
  worstLight(accounts: ReconciliationAccount[]): ReconciliationLight {
    const lights = accounts.filter(a => a.isActive).map(a => this.lightOf(a).light);
    if (lights.includes('danger')) return 'danger';
    if (lights.includes('warn')) return 'warn';
    return 'ok';
  }
}

// Días enteros desde una fecha "yyyy-MM-dd" hasta hoy, sin corrimientos por zona horaria.
function daysSince(isoDate: string, today: Date): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  const from = Date.UTC(y, (m || 1) - 1, d || 1);
  const to = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.floor((to - from) / 86_400_000);
}
