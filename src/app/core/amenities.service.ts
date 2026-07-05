import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Amenity, AmenityReservation, AmenityScheduleSlot } from './models';

@Injectable({ providedIn: 'root' })
export class AmenitiesService {
  private base = `${environment.apiUrl}/amenities`;

  constructor(private http: HttpClient) {}

  getMine(): Observable<Amenity[]> {
    return this.http.get<Amenity[]>(`${this.base}/mine`);
  }

  getSchedule(amenityId: string, from: string, to: string): Observable<AmenityScheduleSlot[]> {
    return this.http.get<AmenityScheduleSlot[]>(`${this.base}/${amenityId}/schedule`, { params: { from, to } });
  }

  reserve(amenityId: string, startsAt: string, endsAt: string, notes: string): Observable<AmenityReservation> {
    return this.http.post<AmenityReservation>(`${this.base}/${amenityId}/reservations`, { startsAt, endsAt, notes });
  }

  getMyReservations(): Observable<AmenityReservation[]> {
    return this.http.get<AmenityReservation[]>(`${this.base}/reservations/mine`);
  }

  attachComprobante(reservationId: string, comprobanteUrl: string): Observable<AmenityReservation> {
    return this.http.post<AmenityReservation>(`${this.base}/reservations/${reservationId}/comprobante`, { comprobanteUrl });
  }

  cancel(reservationId: string): Observable<AmenityReservation> {
    return this.http.post<AmenityReservation>(`${this.base}/reservations/${reservationId}/cancel`, {});
  }
}
