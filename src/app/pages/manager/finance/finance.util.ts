import { ReconciliationMovement } from '../../../core/reconciliation.models';

// "2026-10-20" -> "20/10/2026". Las fechas del libro son solo día: no pasan por Date para que la zona horaria no las corra.
export function fmtDay(value: string | null | undefined): string {
  if (!value) return '—';
  const [y, m, d] = value.split('T')[0].split('-');
  return y && m && d ? `${d}/${m}/${y}` : value;
}

// "20 oct" para los encabezados de día de la lista.
export function fmtDayShort(value: string): string {
  const [, m, d] = value.split('T')[0].split('-');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${Number(d)} ${months[Number(m) - 1] ?? ''}`;
}

// Importe con signo y separador de miles: +350.000 / −120.000.
export function signedGs(value: number): string {
  const abs = String(Math.round(Math.abs(value))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${value < 0 ? '−' : '+'} ${abs}`;
}

export function movementKey(m: Pick<ReconciliationMovement, 'sourceType' | 'sourceId'>): string {
  return `${m.sourceType}|${m.sourceId}`;
}

export interface DayGroup {
  date: string;
  items: ReconciliationMovement[];
}

// Agrupa por día (la lista ya viene ordenada por fecha).
export function groupByDay(items: ReconciliationMovement[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.date === item.date) last.items.push(item);
    else groups.push({ date: item.date, items: [item] });
  }
  return groups;
}

export function sourceLabel(type: string): string {
  switch (type) {
    case 'OwnerPayment': return 'Cobro';
    case 'BuildingExpense': return 'Gasto';
    case 'BuildingIncome': return 'Ingreso';
    case 'SupplierCreditNote': return 'Nota de crédito';
    case 'OpeningBalance': return 'Saldo inicial';
    case 'Transfer': return 'Transferencia';
    default: return type;
  }
}
