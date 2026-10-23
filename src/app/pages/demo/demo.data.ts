// Datos ficticios de la demo del Encargado. Viven solo en memoria: no hay llamadas al servidor y se reinician al salir.

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
  method: string;
  paymentDate: string;
  status: DemoPaymentStatus;
  rejectionReason: string | null;
}

export interface DemoClaim {
  id: string;
  category: string;
  unit: string;
  description: string;
  createdByName: string;
  createdAt: string;
  status: DemoClaimStatus;
}

export interface DemoReservation {
  id: string;
  space: string;
  unit: string;
  requestedBy: string;
  day: string;
  time: string;
  guests: number;
  status: DemoReservationStatus;
}

export const DEMO_BUILDING_NAME = 'Edificio Torre Mirador';

// Cobranza del período (ficticia): coincide con la demo del sitio web.
export const DEMO_CHARGED = 37_770_000;
export const DEMO_COLLECTED = 31_134_000;
export const DEMO_OVERDUE = 8_640_000;
export const DEMO_UNITS_IN_ARREARS = 7;
export const DEMO_CASH = 62_400_000;

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function demoPeriodName(now = new Date()): string {
  return `Expensas de ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

function daysAgo(n: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
}

function daysAhead(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('es-PY', { weekday: 'long', day: '2-digit', month: '2-digit' });
}

export function buildDemoPayments(): DemoPayment[] {
  return [
    { id: 'p1', owner: 'María Benítez', unit: '3C', reference: 'TR-48213', declaredAmount: 1_012_000, reviewedAmount: null, method: 'Transferencia', paymentDate: daysAgo(1), status: 'Pending', rejectionReason: null },
    { id: 'p2', owner: 'Carlos Villalba', unit: '5B', reference: 'DEP-90177', declaredAmount: 1_277_000, reviewedAmount: null, method: 'Depósito', paymentDate: daysAgo(1, 15), status: 'Pending', rejectionReason: null },
    { id: 'p3', owner: 'Liliana González', unit: '7E', reference: 'TR-48390', declaredAmount: 1_277_000, reviewedAmount: null, method: 'Transferencia', paymentDate: daysAgo(2), status: 'Pending', rejectionReason: null },
    { id: 'p4', owner: 'Jorge Ayala', unit: '2A', reference: 'TR-47955', declaredAmount: 650_000, reviewedAmount: 589_000, method: 'Transferencia', paymentDate: daysAgo(3), status: 'UnderReview', rejectionReason: null },
    { id: 'p5', owner: 'Ana Franco', unit: '4D', reference: 'TR-47102', declaredAmount: 851_000, reviewedAmount: 851_000, method: 'Transferencia', paymentDate: daysAgo(5), status: 'Approved', rejectionReason: null }
  ];
}

export function buildDemoClaims(): DemoClaim[] {
  return [
    { id: 'c1', category: 'Mantenimiento', unit: '6A', description: 'Hay una gotera en el techo del estacionamiento, justo sobre mi cochera.', createdByName: 'Diego Peralta', createdAt: daysAgo(1, 8), status: 'Pendiente' },
    { id: 'c2', category: 'Convivencia', unit: '5D', description: 'Ruido de música fuerte pasada la medianoche en el piso 6 el fin de semana.', createdByName: 'Natalia Torres', createdAt: daysAgo(2, 22), status: 'Pendiente' },
    { id: 'c3', category: 'Mantenimiento', unit: '2E', description: 'La luz del pasillo del segundo piso está quemada desde hace tres días.', createdByName: 'Sergio Acosta', createdAt: daysAgo(4, 9), status: 'EnProceso' },
    { id: 'c4', category: 'Seguridad', unit: '8B', description: 'El portón del garaje no cierra bien y queda abierto un rato.', createdByName: 'Mónica Duarte', createdAt: daysAgo(9, 11), status: 'Resuelto' }
  ];
}

export function buildDemoReservations(): DemoReservation[] {
  return [
    { id: 'r1', space: 'Salón de eventos', unit: '4C', requestedBy: 'Rodrigo Giménez', day: daysAhead(5), time: '19:00–23:30', guests: 40, status: 'Pending' },
    { id: 'r2', space: 'Quincho', unit: '7A', requestedBy: 'Patricia Ortiz', day: daysAhead(7), time: '12:00–16:00', guests: 15, status: 'Pending' },
    { id: 'r3', space: 'Piscina', unit: '3B', requestedBy: 'Héctor Núñez', day: daysAhead(3), time: '16:00–18:00', guests: 6, status: 'Pending' },
    { id: 'r4', space: 'Salón de eventos', unit: '1D', requestedBy: 'Laura Maldonado', day: daysAhead(12), time: '20:00–23:00', guests: 25, status: 'Approved' }
  ];
}

export const REJECT_REASONS = ['El comprobante no se lee bien', 'El monto no coincide con el comprobante', 'El pago no figura en el banco'];

export interface DemoDiagnosisQuestion {
  key: 'units' | 'method' | 'pain';
  title: string;
  options: string[];
}

export const DEMO_DIAGNOSIS: DemoDiagnosisQuestion[] = [
  { key: 'units', title: '¿Cuántas unidades administrás?', options: ['Hasta 30', '31 a 100', '101 a 300', 'Más de 300'] },
  { key: 'method', title: '¿Cómo llevás hoy las expensas?', options: ['Planillas de Excel', 'Otro software', 'Cuaderno o papel', 'Lo lleva mi contador'] },
  { key: 'pain', title: '¿Qué te quita más tiempo o te preocupa más?', options: ['Cobrar y la morosidad', 'Controlar gastos y proveedores', 'La contabilidad', 'Rendir cuentas en la asamblea', 'Comunicarme con propietarios'] }
];

export const DEMO_PAIN_RECOMMENDATION: Record<string, string> = {
  'Cobrar y la morosidad': 'Expensas con recargo por mora automático, estados de cuenta por unidad y el informe de morosidad.',
  'Controlar gastos y proveedores': 'Gastos por rubro, proveedores y cuentas por pagar, con el impacto contable al instante.',
  'La contabilidad': 'Libro diario, libro mayor, balance y libro de compras con IVA, listos para tu contador.',
  'Rendir cuentas en la asamblea': 'Informe de asamblea, presupuesto contra lo real y fondo de reserva.',
  'Comunicarme con propietarios': 'Comunicados, reclamos, avisos en la app y votaciones.'
};

// Funciones de la app que la demo no incluye: llevan a la invitación a contactar.
export const DEMO_LOCKED: Record<string, { title: string; text: string; icon: string }> = {
  conciliacion: { title: 'Caja y bancos · conciliación', text: 'Concilia cobros y pagos contra el extracto del banco, directo desde el celular.', icon: 'cash-outline' },
  marketplace: { title: 'Marketplace de espacios', text: 'Alquiler de espacios comunes con pagos, reembolsos y reclamos a cargo del Encargado.', icon: 'storefront-outline' },
  plan: { title: 'Mi plan', text: 'Consultá el plan del edificio, sus vencimientos y pagá la renovación desde la app.', icon: 'ribbon-outline' },
  notificaciones: { title: 'Avisos en tiempo real', text: 'Recibís una notificación en el celular apenas entra un pago, un reclamo o una reserva.', icon: 'notifications-outline' },
  general: { title: 'Expenses para tu edificio', text: 'Pagos, reclamos, reservas, caja y contabilidad, todo conectado entre el administrador, el Encargado y los propietarios.', icon: 'business-outline' }
};
