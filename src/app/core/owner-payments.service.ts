import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { OwnerPayment, OwnerPaymentCreateRequest, OwnerDebtUnit } from './models';

@Injectable({ providedIn: 'root' })
export class OwnerPaymentsService {
  private base = `${environment.apiUrl}/owner-payments`;

  constructor(private http: HttpClient) {}

  getMyDebts(): Observable<OwnerDebtUnit[]> {
    return this.http.get<OwnerDebtUnit[]>(`${this.base}/my-debt`);
  }

  getAll(): Observable<OwnerPayment[]> {
    return this.http.get<OwnerPayment[]>(this.base);
  }

  getById(id: string): Observable<OwnerPayment> {
    return this.http.get<OwnerPayment>(`${this.base}/${id}`);
  }

  submit(request: OwnerPaymentCreateRequest): Observable<OwnerPayment> {
    return this.http.post<OwnerPayment>(this.base, request);
  }

  getMyCredit(): Observable<{ amount: number }> {
    return this.http.get<{ amount: number }>(`${this.base}/my-credit`);
  }

  applyCredit(): Observable<{ settledAmount: number; remainingCredit: number; chargesSettled: number }> {
    return this.http.post<{ settledAmount: number; remainingCredit: number; chargesSettled: number }>(
      `${this.base}/apply-credit`, {}
    );
  }

  getReceiptPdfUrl(id: string, token: string): string {
    return `${this.base}/${id}/receipt-pdf?access_token=${token}`;
  }
}
