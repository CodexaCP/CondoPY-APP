import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AppNotification } from './models';

export interface UnreadCountDto { count: number; }

export interface NotificationRoute {
  path: string;
  state?: Record<string, unknown>;
}

// Misma logica que NotificationsPage.handleTap(), compartida para poder navegar tambien
// al tocar una push notification del sistema (PushService), donde solo se dispone de
// entityType/entityId/type como strings sueltos en el payload de datos de FCM.
export function resolveNotificationRoute(n: { type?: string | null; entityType?: string | null; entityId?: string | null }): NotificationRoute | null {
  if (n.entityType === 'OwnerPayment' && n.entityId) {
    return { path: `/area/payments/${n.entityId}` };
  }
  if (n.type === 'SettlementPendingPresidentReview' && n.entityId) {
    return { path: `/area/settlement-review/${n.entityId}` };
  }
  if (n.entityType === 'ExpensePeriod' && n.entityId) {
    return { path: '/area/account', state: { expensePeriodId: n.entityId } };
  }
  return null;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private base = `${environment.apiUrl}/notifications`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(this.base);
  }

  getUnreadCount(): Observable<UnreadCountDto> {
    return this.http.get<UnreadCountDto>(`${this.base}/unread-count`);
  }

  markRead(id: string): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/read`, {});
  }

  markAllRead(): Observable<void> {
    return this.http.put<void>(`${this.base}/read-all`, {});
  }

  registerDeviceToken(token: string, platform = 'android'): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/devices/register`, { token, platform });
  }

  unregisterDeviceToken(token: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/devices/unregister`, { token });
  }
}
