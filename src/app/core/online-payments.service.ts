import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateOnlinePaymentRequest, OnlinePayment, OnlinePaymentOptions } from './online-payments.models';

@Injectable({ providedIn: 'root' })
export class OnlinePaymentsService {
  private base = `${environment.apiUrl}/online-payments`;

  constructor(private http: HttpClient) {}

  // Por edificio: medios de pago activos, comprobantes con su acumulado y, si no puede pagar ahora, el motivo.
  getOptions(): Observable<OnlinePaymentOptions> {
    return this.http.get<OnlinePaymentOptions>(`${this.base}/options`);
  }

  // Abre el cobro «hasta» un comprobante (se incluyen todos los anteriores del edificio).
  create(request: CreateOnlinePaymentRequest): Observable<OnlinePayment> {
    return this.http.post<OnlinePayment>(this.base, request);
  }

  // Estado del cobro: la pantalla lo consulta cada tanto mientras el propietario paga en la página del proveedor.
  getById(id: string): Observable<OnlinePayment> {
    return this.http.get<OnlinePayment>(`${this.base}/${id}`);
  }
}
