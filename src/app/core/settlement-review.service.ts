import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ExpenseSettlementSummary, PresidentSettlementReview } from './models';

@Injectable({ providedIn: 'root' })
export class SettlementReviewService {
  private base = `${environment.apiUrl}/expense-periods`;

  constructor(private http: HttpClient) {}

  getReview(periodId: string): Observable<PresidentSettlementReview> {
    return this.http.get<PresidentSettlementReview>(`${this.base}/${periodId}/president-review`);
  }

  approve(periodId: string): Observable<ExpenseSettlementSummary> {
    return this.http.post<ExpenseSettlementSummary>(`${this.base}/${periodId}/president-approve-settlement`, {});
  }

  reject(periodId: string, rejectionReason: string): Observable<ExpenseSettlementSummary> {
    return this.http.post<ExpenseSettlementSummary>(`${this.base}/${periodId}/president-reject-settlement`, { rejectionReason });
  }

  getReceiptUrl(expenseId: string, token: string): string {
    return `${environment.apiUrl}/building-expenses/${expenseId}/receipt?access_token=${token}`;
  }
}
