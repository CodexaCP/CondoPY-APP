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
