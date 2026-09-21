import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AccountStatementPeriod, AccountStatementDetail, OwnerPaymentInvoice } from './models';

@Injectable({ providedIn: 'root' })
export class AccountService {
  constructor(private http: HttpClient) {}

  getPeriods(unitId: string): Observable<AccountStatementPeriod[]> {
    return this.http.get<AccountStatementPeriod[]>(
      `${environment.apiUrl}/account-statements/units/${unitId}`
    );
  }

  getPeriodDetail(unitId: string, periodId: string): Observable<AccountStatementDetail> {
    return this.http.get<AccountStatementDetail>(
      `${environment.apiUrl}/account-statements/units/${unitId}/periods/${periodId}`
    );
  }

  getPeriodInvoices(unitId: string, periodId: string): Observable<OwnerPaymentInvoice[]> {
    return this.http.get<OwnerPaymentInvoice[]>(
      `${environment.apiUrl}/account-statements/units/${unitId}/periods/${periodId}/invoices`
    );
  }

  getInvoicePdfUrl(invoiceId: string, token: string): string {
    return `${environment.apiUrl}/invoices/${invoiceId}/pdf?access_token=${token}`;
  }

  getReceiptPdfUrl(unitId: string, periodId: string, token: string): string {
    return `${environment.apiUrl}/account-statements/units/${unitId}/periods/${periodId}/receipt-pdf?access_token=${token}`;
  }

  getSettlementPdfUrl(periodId: string, token: string): string {
    return `${environment.apiUrl}/expense-periods/${periodId}/settlement-pdf?access_token=${token}`;
  }
}
