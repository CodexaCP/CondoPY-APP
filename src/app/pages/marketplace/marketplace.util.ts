import { MarketplaceExploreItem, MarketplaceReservationStatus } from '../../core/marketplace.models';

// Utilidades de fecha, importe y mensajes del marketplace.

export function formatCurrency(value: number): string {
  return `Gs. ${Math.round(value).toLocaleString('es-PY')}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// "03/10/2026 · 19:00 a 22:00 hs" (si cruza la medianoche muestra también el día de fin).
export function formatWindow(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = start.toDateString() === end.toDateString();
  return sameDay
    ? `${formatDate(startIso)} · ${formatTime(startIso)} a ${formatTime(endIso)} hs`
    : `${formatDate(startIso)} ${formatTime(startIso)} → ${formatDate(endIso)} ${formatTime(endIso)} hs`;
}

export function hoursLabel(hours: number): string {
  return hours === 1 ? '1 hora' : `${hours} horas`;
}

// Mensaje de error de la API: texto plano (400/409) u objeto { message } (403).
export function apiErrorMessage(err: any, fallback: string): string {
  const body = err?.error;
  const msg = typeof body === 'string' ? body : (body?.message ?? body?.title ?? body?.detail);
  return msg && String(msg).trim() ? String(msg) : fallback;
}

// Horas disponibles para elegir: cada 30 minutos (00:00, 00:30, ... 23:30).
export function halfHourOptions(): string[] {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      options.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return options;
}

// Fecha local "YYYY-MM-DD" y hora local "HH:mm" de un instante.
export function localDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function localTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ── Reservas ──────────────────────────────────────────────────────────────────


export type Tone = 'green' | 'amber' | 'grey' | 'blue' | 'red';

// Estados en palabras simples (un rechazo se muestra como cancelada, con su motivo).
export function reservationStatusLabel(status: MarketplaceReservationStatus): string {
  switch (status) {
    case 'PendingPayment': return 'Esperando tu pago';
    case 'InReview':       return 'En revisión';
    case 'Confirmed':      return 'Confirmada';
    case 'Completed':      return 'Finalizada';
    case 'Expired':        return 'Vencida';
    default:               return 'Cancelada';
  }
}

export function reservationTone(status: MarketplaceReservationStatus): Tone {
  switch (status) {
    case 'PendingPayment': return 'amber';
    case 'InReview':       return 'blue';
    case 'Confirmed':      return 'green';
    case 'Completed':      return 'grey';
    default:               return 'red';
  }
}

// Tiempo que queda para pagar, "08:41". expired = ya pasó.
export function countdown(expiresIso: string | null, nowMs: number): { text: string; expired: boolean } {
  if (!expiresIso) return { text: '', expired: false };
  const left = Date.parse(expiresIso) - nowMs;
  if (left <= 0) return { text: '00:00', expired: true };
  const totalSeconds = Math.ceil(left / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return { text: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`, expired: false };
}

export interface StartOption {
  startIso: string;
  label: string;
  // Máximo de horas enteras seguidas que se pueden reservar desde ese horario.
  maxHours: number;
}

const SLOT_MS = 30 * 60 * 1000;

// Horarios desde los que se puede reservar al menos una hora entera: empiezan en punto o y media, en el futuro, dentro de la
// ventana y sin pisar lo ya ocupado. Es solo una ayuda para elegir; el servidor valida igual.
export function startOptions(item: MarketplaceExploreItem, nowMs: number): StartOption[] {
  const windowStart = Date.parse(item.windowStartUtc);
  const windowEnd = Date.parse(item.windowEndUtc);

  const taken = new Set<number>();
  for (const interval of item.occupied) {
    const end = Date.parse(interval.endUtc);
    for (let t = Date.parse(interval.startUtc); t < end; t += SLOT_MS) taken.add(t);
  }

  const options: StartOption[] = [];
  for (let start = windowStart; start + 2 * SLOT_MS <= windowEnd; start += SLOT_MS) {
    if (start <= nowMs) continue;

    let maxHours = 0;
    for (let h = 1; start + h * 2 * SLOT_MS <= windowEnd; h++) {
      const firstSlot = start + (h - 1) * 2 * SLOT_MS;
      if (taken.has(firstSlot) || taken.has(firstSlot + SLOT_MS)) break;
      maxHours = h;
    }

    if (maxHours >= 1) {
      const d = new Date(start);
      const day = d.toLocaleDateString('es-PY', { weekday: 'short', day: '2-digit', month: '2-digit' });
      const time = d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
      options.push({ startIso: d.toISOString(), label: `${day} · ${time}`, maxHours });
    }
  }
  return options;
}

// "03/10/2026 19:00": fecha y hora de un instante (plazos de devolución, etc.).
export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}
