import { HttpErrorResponse } from '@angular/common/http';
import { formatMoney } from '../../core/locale.util';

// Importe en la moneda de la empresa con separador de miles: 1250000 -> "Gs. 1.250.000" (guaraníes) o "$ 1.250,50" (pesos).
// El nombre se conserva porque lo usan muchas pantallas.
export function formatGs(value: number | null | undefined): string {
  return formatMoney(value);
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-PY', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

// "dd/MM/yyyy HH:mm–HH:mm" si empieza y termina el mismo día; si no, "desde ... hasta ...".
export function fmtRange(startsAt: string, endsAt: string): string {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  const day = (d: Date) => d.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = (d: Date) => d.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', hour12: false });
  return s.toDateString() === e.toDateString()
    ? `${day(s)} · ${time(s)}–${time(e)}`
    : `${day(s)} ${time(s)} → ${day(e)} ${time(e)}`;
}

// Mensaje legible de un error HTTP: el backend devuelve texto plano, { message } o ProblemDetails.
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof HttpErrorResponse) {
    const body = err.error;
    if (typeof body === 'string' && body.trim()) return body;
    const text = body?.message ?? body?.detail ?? body?.title;
    if (typeof text === 'string' && text.trim()) return text;
    if (err.status === 0) return 'No se pudo conectar. Verificá tu conexión.';
  }
  return fallback;
}

export function isPdf(url: string | null | undefined): boolean {
  return !!url && /\.pdf(\?|$)/i.test(url);
}
