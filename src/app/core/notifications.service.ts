import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AppNotification } from './models';
import { isManagerRole } from './roles';

export interface UnreadCountDto { count: number; }

export interface NotificationRoute {
  path: string;
  state?: Record<string, unknown>;
}

// Misma logica que NotificationsPage.handleTap(), compartida para poder navegar tambien
// al tocar una push notification del sistema (PushService), donde solo se dispone de
// entityType/entityId/type como strings sueltos en el payload de datos de FCM.
//
// El destino depende del rol: el mismo aviso ("OwnerPayment") lleva al Encargado a revisar el pago y al
// propietario a ver su pago.
export function resolveNotificationRoute(
  n: { type?: string | null; entityType?: string | null; entityId?: string | null },
  role?: string | null
): NotificationRoute | null {
  if (isManagerRole(role)) {
    return resolveManagerRoute(n);
  }

  if (n.entityType === 'OwnerPayment' && n.entityId) {
    return { path: `/area/payments/${n.entityId}` };
  }
  // Avisos del Marketplace (reserva vencida, confirmada, rechazada, cancelada, nueva reserva en mi espacio, reclamo, reembolso):
  // se abre la reserva en la lista donde esté (mis reservas o las recibidas en mis espacios).
  if (n.entityType === 'MarketplaceReservation') {
    return n.entityId
      ? { path: `/area/marketplace?focus=${n.entityId}` }
      : { path: '/area/marketplace?tab=reservations' };
  }
  if (n.type === 'SettlementPendingPresidentReview' && n.entityId) {
    return { path: `/area/settlement-review/${n.entityId}` };
  }
  if (n.entityType === 'ExpensePeriod' && n.entityId) {
    return { path: '/area/account', state: { expensePeriodId: n.entityId } };
  }
  return null;
}

function resolveManagerRoute(n: { type?: string | null; entityType?: string | null; entityId?: string | null }): NotificationRoute | null {
  switch (n.entityType) {
    case 'OwnerPayment':
      return n.entityId ? { path: `/manager/payments/${n.entityId}` } : { path: '/manager/payments' };
    case 'Claim':
      return { path: '/manager/claims' };
    case 'AmenityReservation':
      return { path: '/manager/reservations' };
    case 'BuildingPlan':
      return { path: '/manager/plan' };
    // Pago de una reserva del Marketplace por revisar, reembolso por devolver o reclamo por resolver.
    case 'MarketplacePayment':
      return { path: '/manager/marketplace' };
    case 'MarketplaceRefund':
      return { path: '/manager/marketplace?tab=refunds' };
    case 'MarketplaceClaim':
      return { path: '/manager/marketplace?tab=claims' };
    default:
      return null;
  }
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
