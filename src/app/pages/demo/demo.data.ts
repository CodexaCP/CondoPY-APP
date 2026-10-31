// Datos ficticios de la demo del Encargado. Viven solo en memoria: no hay llamadas al servidor y se reinician al salir.
// No llevan textos en ningún idioma: guardan identificadores y demo.i18n.ts los nombra.

import { MethodId, RejectReasonId } from './demo.i18n';

export type DemoPaymentStatus = 'Pending' | 'UnderReview' | 'Approved' | 'Rejected';
export type DemoClaimStatus = 'Pendiente' | 'EnProceso' | 'Resuelto';
export type DemoReservationStatus = 'Pending' | 'Approved' | 'Rejected';

export interface DemoPayment {
  id: string;
  owner: string;
  unit: string;
  reference: string;
  declaredAmount: number;
  reviewedAmount: number | null;
  method: MethodId;
  paymentDate: string;
  status: DemoPaymentStatus;
  rejectionReason: RejectReasonId | null;
}

export interface DemoClaim {
  id: string; // categoría y descripción: demo.i18n.ts, por id
  unit: string;
  createdByName: string;
  createdAt: string;
  status: DemoClaimStatus;
}

export interface DemoReservation {
  id: string; // espacio: demo.i18n.ts, por id
  unit: string;
  requestedBy: string;
  dayOffset: number; // días desde hoy
  time: string;
  guests: number;
  status: DemoReservationStatus;
}

// Cobranza del período (ficticia): coincide con la demo del sitio web.
export const DEMO_CHARGED = 37_770_000;
export const DEMO_COLLECTED = 31_134_000;
export const DEMO_OVERDUE = 8_640_000;
export const DEMO_UNITS_IN_ARREARS = 7;
export const DEMO_CASH = 62_400_000;

function daysAgo(n: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
}

export function buildDemoPayments(): DemoPayment[] {
  return [
    { id: 'p1', owner: 'María Benítez', unit: '3C', reference: 'TR-48213', declaredAmount: 1_012_000, reviewedAmount: null, method: 'transfer', paymentDate: daysAgo(1), status: 'Pending', rejectionReason: null },
    { id: 'p2', owner: 'Carlos Villalba', unit: '5B', reference: 'DEP-90177', declaredAmount: 1_277_000, reviewedAmount: null, method: 'deposit', paymentDate: daysAgo(1, 15), status: 'Pending', rejectionReason: null },
    { id: 'p3', owner: 'Liliana González', unit: '7E', reference: 'TR-48390', declaredAmount: 1_277_000, reviewedAmount: null, method: 'transfer', paymentDate: daysAgo(2), status: 'Pending', rejectionReason: null },
    { id: 'p4', owner: 'Jorge Ayala', unit: '2A', reference: 'TR-47955', declaredAmount: 650_000, reviewedAmount: 589_000, method: 'transfer', paymentDate: daysAgo(3), status: 'UnderReview', rejectionReason: null },
    { id: 'p5', owner: 'Ana Franco', unit: '4D', reference: 'TR-47102', declaredAmount: 851_000, reviewedAmount: 851_000, method: 'transfer', paymentDate: daysAgo(5), status: 'Approved', rejectionReason: null }
  ];
}

export function buildDemoClaims(): DemoClaim[] {
  return [
    { id: 'c1', unit: '6A', createdByName: 'Diego Peralta', createdAt: daysAgo(1, 8), status: 'Pendiente' },
    { id: 'c2', unit: '5D', createdByName: 'Natalia Torres', createdAt: daysAgo(2, 22), status: 'Pendiente' },
    { id: 'c3', unit: '2E', createdByName: 'Sergio Acosta', createdAt: daysAgo(4, 9), status: 'EnProceso' },
    { id: 'c4', unit: '8B', createdByName: 'Mónica Duarte', createdAt: daysAgo(9, 11), status: 'Resuelto' }
  ];
}

export function buildDemoReservations(): DemoReservation[] {
  return [
    { id: 'r1', unit: '4C', requestedBy: 'Rodrigo Giménez', dayOffset: 5, time: '19:00–23:30', guests: 40, status: 'Pending' },
    { id: 'r2', unit: '7A', requestedBy: 'Patricia Ortiz', dayOffset: 7, time: '12:00–16:00', guests: 15, status: 'Pending' },
    { id: 'r3', unit: '3B', requestedBy: 'Héctor Núñez', dayOffset: 3, time: '16:00–18:00', guests: 6, status: 'Pending' },
    { id: 'r4', unit: '1D', requestedBy: 'Laura Maldonado', dayOffset: 12, time: '20:00–23:00', guests: 25, status: 'Approved' }
  ];
}

export const REJECT_REASON_IDS: RejectReasonId[] = ['unreadable', 'amount', 'notInBank'];

// Íconos de las funciones de la app que la demo no incluye (los textos están en demo.i18n.ts).
export const DEMO_LOCKED_ICONS: Record<string, string> = {
  conciliacion: 'cash-outline',
  marketplace: 'storefront-outline',
  plan: 'ribbon-outline',
  notificaciones: 'notifications-outline',
  general: 'business-outline'
};
