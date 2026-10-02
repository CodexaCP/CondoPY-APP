import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { finalize, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  MarketplaceBuilding,
  MarketplaceListing,
  MarketplaceListingCreateRequest,
  MarketplaceExploreItem,
  MarketplaceListingUpdateRequest,
  MarketplacePublishableUnit,
  MarketplaceQuote,
  MarketplaceQuoteRequest,
  MarketplaceReservation
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

  readonly buildings$ = this.buildingsSubject.asObservable();
  readonly selected$ = this.selectedSubject.asObservable();

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

  // Cancelar una reserva que todavía no se pagó (libera el horario).
  cancelReservation(id: string): Observable<MarketplaceReservation> {
    return this.http.post<MarketplaceReservation>(`${this.base}/reservations/${id}/cancel`, {});
  }

  private pickInitial(list: MarketplaceBuilding[]): MarketplaceBuilding | null {
    if (list.length === 0) return null;
    let saved: string | null = null;
    try { saved = localStorage.getItem(KEY); } catch { /* nada */ }
    return list.find(b => b.buildingId === saved) ?? list.find(b => b.canPublish) ?? list[0];
  }
}
