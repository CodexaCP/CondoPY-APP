import { Injectable, NgZone } from '@angular/core';
import { NavController, ToastController } from '@ionic/angular';
import { BehaviorSubject, Subscription, firstValueFrom, interval } from 'rxjs';
import { AuthService } from './auth.service';
import { AppNotification } from './models';
import { NotificationTone, notificationVisual } from './notification-visuals';
import { NotificationsService, notificationsPathFor, resolveNotificationRoute } from './notifications.service';

const POLL_MS = 30_000;
// Hasta cuántos avisos se muestran uno por uno; si llegan más de golpe se resume en uno solo.
const MAX_INDIVIDUAL = 3;
const TOAST_MS = 6000;
const TOAST_MS_QUEUED = 4500;
// Ventana en la que una push no repite un aviso que la consulta ya mostró.
const DEDUPE_MS = 60_000;

interface Alert {
  title: string;
  body: string;
  icon: string;
  tone: NotificationTone;
  onTap: () => void;
}

// Datos de la push recibida con la app abierta: sirven de respaldo si la consulta no trae la notificación.
export interface PushPayload {
  title: string;
  body: string;
  data: Record<string, string>;
}

// Muestra un aviso en pantalla (banner arriba) cuando llega una notificación con la app abierta.
//
// Android no muestra la push del sistema con la app en primer plano, y no todos tienen push (permiso negado,
// Firebase caído). Por eso el aviso no depende de la push: se consulta la bandeja cada 30 segundos y se avisa de lo
// nuevo; la push, cuando llega con la app abierta, solo adelanta esa consulta (refresh) para que el aviso salga al instante.
//
// De paso es la única fuente del contador de la campana (unreadCount$), así no hay tres pantallas consultando lo mismo.
@Injectable({ providedIn: 'root' })
export class NotificationAlertService {
  readonly unreadCount$ = new BehaviorSubject<number>(0);

  private timer?: Subscription;
  private userId: string | null = null;
  private seen = new Set<string>();
  private baselineDone = false;
  private busy = false;
  private rerun: { push?: PushPayload } | null = null;
  private queue: Alert[] = [];
  private showing = false;
  private recent = new Map<string, number>();

  constructor(
    private svc: NotificationsService,
    private auth: AuthService,
    private toastCtrl: ToastController,
    private navCtrl: NavController,
    private zone: NgZone
  ) {}

  /** Arranca la consulta periódica. Es seguro llamarlo varias veces; sin sesión no hace nada. */
  start(): void {
    if (!this.timer) {
      this.timer = interval(POLL_MS).subscribe(() => void this.refresh());
    }
    void this.refresh();
  }

  /** Consulta ya (por ejemplo al llegar una push con la app abierta, o al volver a primer plano). */
  async refresh(push?: PushPayload): Promise<void> {
    const user = this.auth.getUser();
    if (!this.auth.isLoggedIn() || !user) {
      this.reset(null);
      return;
    }
    if (user.userId !== this.userId) {
      this.reset(user.userId);
    }

    if (this.busy) {
      this.rerun = { push: push ?? this.rerun?.push };
      return;
    }
    this.busy = true;

    try {
      const items = await firstValueFrom(this.svc.getAll());
      const fresh = this.takeFresh(items);
      this.present(fresh, push);
    } catch {
      // Sin red o con el servidor caído: se reintenta en la próxima vuelta. Si llegó una push, igual se avisa.
      if (push) this.present([], push);
    } finally {
      this.busy = false;
      const next = this.rerun;
      this.rerun = null;
      if (next) void this.refresh(next.push);
    }
  }

  /** Marca como leídas las notificaciones de una entidad (al abrirla desde la push del sistema). */
  markEntityRead(entityType?: string | null, entityId?: string | null): void {
    if (!entityType || !entityId) return;
    this.svc.getAll().subscribe({
      next: items => {
        const pending = items.filter(i => !i.isRead && i.entityType === entityType && i.entityId === entityId);
        pending.forEach(i => this.svc.markRead(i.id).subscribe());
        if (pending.length) this.unreadCount$.next(Math.max(0, this.unreadCount$.value - pending.length));
      },
      error: () => { /* silencioso: queda como no leída y se marca desde la lista */ }
    });
  }

  private reset(userId: string | null): void {
    this.userId = userId;
    this.seen.clear();
    this.baselineDone = false;
    this.queue = [];
    this.unreadCount$.next(0);
  }

  // Devuelve las no leídas que todavía no se avisaron, de la más vieja a la más nueva.
  private takeFresh(items: AppNotification[]): AppNotification[] {
    const unread = items.filter(i => !i.isRead);
    this.unreadCount$.next(unread.length);

    let fresh: AppNotification[];
    if (!this.baselineDone) {
      // Primera consulta de esta sesión: solo se avisa lo que llegó después de la última vez que se avisó (por ejemplo,
      // mientras la app estaba cerrada). Sin marca previa (primer uso) no se avisa nada: no se inunda al entrar.
      const cursor = this.readCursor();
      fresh = cursor === null ? [] : unread.filter(i => this.time(i) > cursor);
      this.baselineDone = true;
    } else {
      fresh = unread.filter(i => !this.seen.has(i.id));
    }

    items.forEach(i => this.seen.add(i.id));
    const newest = items.reduce((max, i) => Math.max(max, this.time(i)), 0);
    if (newest > 0) this.saveCursor(newest);

    return fresh.sort((a, b) => this.time(a) - this.time(b));
  }

  private present(fresh: AppNotification[], push?: PushPayload): void {
    if (fresh.length > MAX_INDIVIDUAL) {
      const last = fresh[fresh.length - 1];
      fresh.forEach(n => this.markAlerted(this.keyOf(n.entityType, n.entityId, n.title, n.body)));
      this.enqueue({
        title: `Tienes ${fresh.length} notificaciones nuevas`,
        body: last.title,
        icon: 'notifications-outline',
        tone: 'brand',
        onTap: () => this.openList()
      });
      return;
    }

    if (fresh.length === 0 && push) {
      // La push llegó pero la consulta no trajo la notificación: se muestra con los datos de la propia push,
      // salvo que esa misma notificación ya se haya avisado hace un momento (la consulta se adelantó a la push).
      if (this.wasRecentlyAlerted(this.keyOf(push.data['entityType'], push.data['entityId'], push.title, push.body))) return;
      const route = resolveNotificationRoute(
        { type: push.data['type'], entityType: push.data['entityType'], entityId: push.data['entityId'] },
        this.auth.getUser()?.role
      );
      this.enqueue({
        title: push.title || 'Nueva notificación',
        body: push.body,
        icon: notificationVisual(push.data['type']).icon,
        tone: notificationVisual(push.data['type']).tone,
        onTap: () => (route ? this.navigate(route.path, route.state) : this.openList())
      });
      return;
    }

    for (const n of fresh) {
      const visual = notificationVisual(n.type);
      this.markAlerted(this.keyOf(n.entityType, n.entityId, n.title, n.body));
      this.enqueue({
        title: n.title,
        body: n.body,
        icon: visual.icon,
        tone: visual.tone,
        onTap: () => this.open(n)
      });
    }
  }

  private open(n: AppNotification): void {
    this.svc.markRead(n.id).subscribe({ error: () => { /* queda como no leída */ } });
    this.unreadCount$.next(Math.max(0, this.unreadCount$.value - 1));

    const route = resolveNotificationRoute(n, this.auth.getUser()?.role);
    if (route) this.navigate(route.path, route.state);
    else this.openList();
  }

  private openList(): void {
    this.navigate(notificationsPathFor(this.auth.getUser()?.role));
  }

  private navigate(path: string, state?: Record<string, unknown>): void {
    this.zone.run(() => this.navCtrl.navigateForward(path, state ? { state } : undefined));
  }

  private keyOf(entityType?: string | null, entityId?: string | null, title?: string, body?: string): string {
    return entityType && entityId ? `${entityType}|${entityId}` : `${title ?? ''}|${body ?? ''}`;
  }

  private markAlerted(key: string): void {
    const now = Date.now();
    this.recent.set(key, now);
    for (const [k, t] of this.recent) if (now - t > DEDUPE_MS) this.recent.delete(k);
  }

  private wasRecentlyAlerted(key: string): boolean {
    const t = this.recent.get(key);
    return t !== undefined && Date.now() - t < DEDUPE_MS;
  }

  private enqueue(alert: Alert): void {
    this.queue.push(alert);
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.showing) return;
    this.showing = true;
    try {
      while (this.queue.length) {
        const alert = this.queue.shift()!;
        await this.show(alert, this.queue.length > 0);
      }
    } finally {
      this.showing = false;
    }
  }

  private async show(alert: Alert, queued: boolean): Promise<void> {
    const toast = await this.toastCtrl.create({
      header: alert.title,
      message: alert.body,
      icon: alert.icon,
      position: 'top',
      duration: queued ? TOAST_MS_QUEUED : TOAST_MS,
      swipeGesture: 'vertical',
      cssClass: ['notif-toast', `tone-${alert.tone}`],
      buttons: [{ icon: 'close', role: 'cancel', htmlAttributes: { 'aria-label': 'Cerrar' } }]
    });

    // Tocar el aviso lo abre; el botón de cerrar solo lo cierra.
    toast.addEventListener('click', ev => {
      const onButton = ev.composedPath().some(el => el instanceof HTMLElement && el.classList.contains('toast-button'));
      if (onButton) return;
      void toast.dismiss();
      alert.onTap();
    });

    await toast.present();
    await toast.onDidDismiss();
  }

  private time(n: AppNotification): number {
    const t = Date.parse(n.createdAtUtc);
    return Number.isNaN(t) ? 0 : t;
  }

  private cursorKey(): string {
    return `condopy_notif_cursor:${this.userId}`;
  }

  private readCursor(): number | null {
    try {
      const raw = localStorage.getItem(this.cursorKey());
      const value = raw ? Number(raw) : NaN;
      return Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  }

  private saveCursor(value: number): void {
    try {
      const current = this.readCursor();
      if (current === null || value > current) localStorage.setItem(this.cursorKey(), String(value));
    } catch { /* sin almacenamiento: se pierde solo el aviso de lo llegado con la app cerrada */ }
  }
}
