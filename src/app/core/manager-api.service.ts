import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Claim, ClaimStatus, AmenityReservation } from './models';
import {
  ManagerOwnerPayment,
  ManagerPage,
  ManagerPlan,
  ManagerPlanPayment,
  ManagerPlanPaymentRequest,
  ManagerSummary
} from './manager.models';

// Endpoints que usa la sección del Encargado. Todos aceptan el buildingId del edificio seleccionado.
@Injectable({ providedIn: 'root' })
export class ManagerApiService {
  private readonly api = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Inicio ───────────────────────────────────────────────────────────────
  getSummary(buildingId: string): Observable<ManagerSummary> {
    return this.http.get<ManagerSummary>(`${this.api}/manager/summary`, { params: { buildingId } });
  }

  // ── Pagos de propietarios ────────────────────────────────────────────────
  // status admite varios valores separados por coma; el total sale del encabezado X-Total-Count.
  getPayments(buildingId: string, statuses: string[], page: number, pageSize = 25): Observable<ManagerPage<ManagerOwnerPayment>> {
    const params = new HttpParams()
      .set('buildingId', buildingId)
      .set('status', statuses.join(','))
      .set('page', page)
      .set('pageSize', pageSize);

    return this.http.get<ManagerOwnerPayment[]>(`${this.api}/owner-payments`, { params, observe: 'response' }).pipe(
      map((res: HttpResponse<ManagerOwnerPayment[]>) => {
        const items = res.body ?? [];
        const header = Number(res.headers.get('X-Total-Count'));
        return { items, total: Number.isFinite(header) && header > 0 ? header : items.length };
      })
    );
  }

  getPayment(id: string): Observable<ManagerOwnerPayment> {
    return this.http.get<ManagerOwnerPayment>(`${this.api}/owner-payments/${id}`);
  }

  reviewPayment(id: string, reviewedAmount: number): Observable<ManagerOwnerPayment> {
    return this.http.put<ManagerOwnerPayment>(`${this.api}/owner-payments/${id}/review`, { reviewedAmount });
  }

  approvePayment(id: string): Observable<ManagerOwnerPayment> {
    return this.http.put<ManagerOwnerPayment>(`${this.api}/owner-payments/${id}/approve`, {});
  }

  rejectPayment(id: string, rejectionReason: string): Observable<ManagerOwnerPayment> {
    return this.http.put<ManagerOwnerPayment>(`${this.api}/owner-payments/${id}/reject`, { rejectionReason });
  }

  // ── Reclamos ─────────────────────────────────────────────────────────────
  getClaims(buildingId: string, status?: ClaimStatus): Observable<Claim[]> {
    let params = new HttpParams().set('buildingId', buildingId);
    if (status) params = params.set('status', status);
    return this.http.get<Claim[]>(`${this.api}/claims`, { params });
  }

  updateClaimStatus(id: string, status: ClaimStatus): Observable<Claim> {
    return this.http.patch<Claim>(`${this.api}/claims/${id}/status`, { status });
  }

  // ── Reservas de áreas comunes ────────────────────────────────────────────
  getReservations(buildingId: string): Observable<AmenityReservation[]> {
    return this.http.get<AmenityReservation[]>(`${this.api}/amenities/reservations`, { params: { buildingId } });
  }

  reviewReservation(id: string, approve: boolean, rejectionReason?: string): Observable<AmenityReservation> {
    return this.http.post<AmenityReservation>(`${this.api}/amenities/reservations/${id}/review`, {
      approve,
      rejectionReason: rejectionReason?.trim() || null
    });
  }

  // ── Plan de la empresa ───────────────────────────────────────────────────
  getMyPlans(): Observable<ManagerPlan[]> {
    return this.http.get<ManagerPlan[]>(`${this.api}/building-plans/my-plan`);
  }

  getPlanPayments(): Observable<ManagerPlanPayment[]> {
    return this.http.get<ManagerPlanPayment[]>(`${this.api}/building-plan-payments`);
  }

  submitPlanPayment(request: ManagerPlanPaymentRequest): Observable<ManagerPlanPayment> {
    return this.http.post<ManagerPlanPayment>(`${this.api}/building-plan-payments`, request);
  }
}
