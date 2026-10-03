import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { finalize, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  MarketplaceBuilding,
  MarketplaceCancelPreview,
  MarketplaceClaim,
  MarketplaceClaimResolution,
  MarketplaceHandoverNote,
  MarketplaceListing,
  MarketplaceListingCreateRequest,
  MarketplaceExploreItem,
  MarketplaceListingUpdateRequest,
  MarketplacePaymentInfo,
  MarketplaceReviewItem,
  MarketplacePublishableUnit,
  MarketplaceQuote,
  MarketplaceQuoteRequest,
  MarketplaceOwnerReservation,
  MarketplaceRefund,
  MarketplaceReservation,
  MarketplaceStaffBuilding
} from './marketplace.models';

const KEY = 'condopy_marketplace_building';

// Marketplace de espacios. Se trabaja con UN edificio a la vez: el último que eligió el usuario (o el primero). El
// backend valida igual el edificio de cada pedido, así que esto es solo comodidad para la pantalla.
@Injectable({ providedIn: 'root' })
export class MarketplaceService {
  private readonly base = `${environment.apiUrl}/marketplace`;
  private readonly buildingsSubject = new BehaviorSubject<MarketplaceBuilding[]>([]);
  private readonly selectedSubject = new BehaviorSubject<MarketplaceBuilding | null>(null);
  private loaded = false;
  private pending$: Observable<MarketplaceBuilding[]> | null = null;

  // Edificios donde el Encargado puede revisar pagos del marketplace (solo los que tienen el módulo disponible).
  private readonly staffBuildingsSubject = new BehaviorSubject<MarketplaceStaffBuilding[]>([]);

  readonly buildings$ = this.buildingsSubject.asObservable();
  readonly selected$ = this.selectedSubject.asObservable();
  readonly staffBuildings$ = this.staffBuildingsSubject.asObservable();

  constructor(private http: HttpClient) {}

  get buildings(): MarketplaceBuilding[] { return this.buildingsSubject.value; }
  get selected(): MarketplaceBuilding | null { return this.selectedSubject.value; }

  // Edificios del usuario con el marketplace disponible. Se carga una vez por sesión (o de nuevo si force).
  loadBuildings(force = false): Observable<MarketplaceBuilding[]> {
    if (this.loaded && !force) return of(this.buildings);
    if (this.pending$) return this.pending$;

    this.pending$ = this.http.get<MarketplaceBuilding[]>(`${this.base}/buildings`).pipe(
      tap(list => {
        this.loaded = true;
        this.buildingsSubject.next(list);
        this.selectedSubject.next(this.pickInitial(list));
      }),
      finalize(() => { this.pending$ = null; }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.pending$;
  }

  // Edificios del personal con el marketplace disponible y sus permisos (para mostrar u ocultar la sección del Encargado).
  loadStaffBuildings(): Observable<MarketplaceStaffBuilding[]> {
    return this.http.get<MarketplaceStaffBuilding[]>(`${this.base}/staff-buildings`).pipe(
      tap(list => this.staffBuildingsSubject.next(list))
    );
  }

  select(id: string): void {
    const found = this.buildings.find(b => b.buildingId === id);
    if (!found) return;
    try { localStorage.setItem(KEY, id); } catch { /* sin almacenamiento: no se recuerda */ }
    this.selectedSubject.next(found);
  }

  // Al cerrar sesión se olvida todo, para que no pase a la próxima cuenta.
  clear(): void {
    this.loaded = false;
    this.buildingsSubject.next([]);
    this.selectedSubject.next(null);
    this.staffBuildingsSubject.next([]);
    try { localStorage.removeItem(KEY); } catch { /* nada */ }
  }

  // Unidades que puede publicar (de las que es propietario principal).
  getUnits(buildingId: string): Observable<MarketplacePublishableUnit[]> {
    return this.http.get<MarketplacePublishableUnit[]>(`${this.base}/listings/units`, { params: { buildingId } });
  }

  getMine(buildingId: string): Observable<MarketplaceListing[]> {
    return this.http.get<MarketplaceListing[]>(`${this.base}/listings/mine`, { params: { buildingId } });
  }

  create(request: MarketplaceListingCreateRequest): Observable<MarketplaceListing> {
    return this.http.post<MarketplaceListing>(`${this.base}/listings`, request);
  }

  update(id: string, request: MarketplaceListingUpdateRequest): Observable<MarketplaceListing> {
    return this.http.put<MarketplaceListing>(`${this.base}/listings/${id}`, request);
  }

  suspend(id: string, reason?: string): Observable<MarketplaceListing> {
    return this.http.post<MarketplaceListing>(`${this.base}/listings/${id}/suspend`, { reason: reason ?? null });
  }

  resume(id: string): Observable<MarketplaceListing> {
    return this.http.post<MarketplaceListing>(`${this.base}/listings/${id}/resume`, {});
  }

  close(id: string, reason?: string): Observable<MarketplaceListing> {
    return this.http.post<MarketplaceListing>(`${this.base}/listings/${id}/close`, { reason: reason ?? null });
  }

  // ── Explorar y reservar ──────────────────────────────────────────────────

  // Publicaciones de otros vecinos de mi edificio con horario libre.
  explore(buildingId: string): Observable<MarketplaceExploreItem[]> {
    return this.http.get<MarketplaceExploreItem[]>(`${this.base}/listings/explore`, { params: { buildingId } });
  }

  // Desglose exacto (lo calcula el servidor); no reserva nada.
  quote(request: MarketplaceQuoteRequest): Observable<MarketplaceQuote> {
    return this.http.post<MarketplaceQuote>(`${this.base}/reservations/quote`, request);
  }

  reserve(request: MarketplaceQuoteRequest): Observable<MarketplaceReservation> {
    return this.http.post<MarketplaceReservation>(`${this.base}/reservations`, request);
  }

  getMyReservations(buildingId: string): Observable<MarketplaceReservation[]> {
    return this.http.get<MarketplaceReservation[]>(`${this.base}/reservations/mine`, { params: { buildingId } });
  }

  // Qué pasa si cancelo (monto a devolver y comisión): lo calcula el servidor para avisarlo antes de confirmar.
  cancelPreview(id: string): Observable<MarketplaceCancelPreview> {
    return this.http.get<MarketplaceCancelPreview>(`${this.base}/reservations/${id}/cancel-preview`);
  }

  // El comprador cancela: sin pagar libera el horario; ya pagada y antes del inicio se le devuelve la base (la comisión no).
  cancelReservation(id: string, reason?: string): Observable<MarketplaceReservation> {
    return this.http.post<MarketplaceReservation>(`${this.base}/reservations/${id}/cancel`, { reason: reason ?? null });
  }

  // Reservas de MIS publicaciones (quién reservó: nombre y unidad).
  getOnMyListings(buildingId: string): Observable<MarketplaceOwnerReservation[]> {
    return this.http.get<MarketplaceOwnerReservation[]>(`${this.base}/reservations/on-my-listings`, { params: { buildingId } });
  }

  // El propietario cancela una reserva ya pagada (motivo obligatorio): devolución total al comprador y comisión a su cargo.
  ownerCancel(id: string, reason: string): Observable<MarketplaceOwnerReservation> {
    return this.http.post<MarketplaceOwnerReservation>(`${this.base}/reservations/${id}/owner-cancel`, { reason });
  }

  // "Reportar un problema" (comprador o propietario): retiene la acreditación y avisa al Encargado.
  openClaim(id: string, reason: string): Observable<MarketplaceClaim> {
    return this.http.post<MarketplaceClaim>(`${this.base}/reservations/${id}/claim`, { reason });
  }

  // Respuesta al aviso de inicio: solo queda registrada (sin devolución automática).
  respondStart(id: string, attending: boolean, reason?: string): Observable<MarketplaceReservation> {
    return this.http.post<MarketplaceReservation>(`${this.base}/reservations/${id}/start-response`, { attending, reason: reason ?? null });
  }

  // ── Pago (comprador) ─────────────────────────────────────────────────────

  // Datos para pagar; los datos para transferir solo vienen mientras la reserva espera el pago.
  paymentInfo(reservationId: string): Observable<MarketplacePaymentInfo> {
    return this.http.get<MarketplacePaymentInfo>(`${this.base}/reservations/${reservationId}/payment-info`);
  }

  // Envía el comprobante (ya subido con UploadService): la reserva pasa a "en revisión".
  submitPayment(reservationId: string, comprobanteUrl: string): Observable<MarketplaceReservation> {
    return this.http.post<MarketplaceReservation>(`${this.base}/reservations/${reservationId}/payment`, { comprobanteUrl });
  }

  // ── Revisión (personal del edificio) ─────────────────────────────────────

  pendingPayments(buildingId: string): Observable<MarketplaceReviewItem[]> {
    return this.http.get<MarketplaceReviewItem[]>(`${this.base}/payments/pending`, { params: { buildingId } });
  }

  approvePayment(paymentId: string, reviewedAmount: number): Observable<MarketplaceReviewItem> {
    return this.http.post<MarketplaceReviewItem>(`${this.base}/payments/${paymentId}/approve`, { reviewedAmount });
  }

  rejectPayment(paymentId: string, reason: string): Observable<MarketplaceReviewItem> {
    return this.http.post<MarketplaceReviewItem>(`${this.base}/payments/${paymentId}/reject`, { reason });
  }

  // ── Documentos ───────────────────────────────────────────────────────────

  // Comprobante interno de la reserva en PDF (no fiscal): comprador, propietario de la reserva o personal. Se abre con el token en la URL.
  receiptPdfUrl(reservationId: string, token: string): string {
    return `${this.base}/reservations/${reservationId}/receipt-pdf?access_token=${token}`;
  }

  // Notas de cambio de propietario principal (Encargado): las no leídas primero.
  handoverNotes(buildingId: string, includeRead = false): Observable<MarketplaceHandoverNote[]> {
    return this.http.get<MarketplaceHandoverNote[]>(`${this.base}/handover-notes`, { params: { buildingId, includeRead } });
  }

  // Abre la nota con la situación actual (la primera vez queda marcada como leída).
  handoverNote(id: string): Observable<MarketplaceHandoverNote> {
    return this.http.get<MarketplaceHandoverNote>(`${this.base}/handover-notes/${id}`);
  }

  handoverPdfUrl(id: string, token: string): string {
    return `${this.base}/handover-notes/${id}/pdf?access_token=${token}`;
  }

  // ── Seguimiento del Encargado: reembolsos y reclamos ─────────────────────

  refunds(buildingId: string, includeReturned = false): Observable<MarketplaceRefund[]> {
    return this.http.get<MarketplaceRefund[]>(`${this.base}/refunds`, { params: { buildingId, includeReturned } });
  }

  markRefundReturned(id: string): Observable<MarketplaceRefund> {
    return this.http.post<MarketplaceRefund>(`${this.base}/refunds/${id}/return`, {});
  }

  claims(buildingId: string, includeResolved = false): Observable<MarketplaceClaim[]> {
    return this.http.get<MarketplaceClaim[]>(`${this.base}/claims`, { params: { buildingId, includeResolved } });
  }

  resolveClaim(id: string, outcome: MarketplaceClaimResolution, note: string): Observable<MarketplaceClaim> {
    return this.http.post<MarketplaceClaim>(`${this.base}/claims/${id}/resolve`, { outcome, note });
  }

  private pickInitial(list: MarketplaceBuilding[]): MarketplaceBuilding | null {
    if (list.length === 0) return null;
    let saved: string | null = null;
    try { saved = localStorage.getItem(KEY); } catch { /* nada */ }
    return list.find(b => b.buildingId === saved) ?? list.find(b => b.canPublish) ?? list[0];
  }
}
