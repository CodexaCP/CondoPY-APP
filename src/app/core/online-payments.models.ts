// Pago online de expensas con tarjeta. El dinero no pasa por Expenses: el propietario paga en la página del proveedor (a nombre del titular del
// comercio) y Expenses se entera por un aviso del proveedor.

export type OnlinePaymentStatus = 'Open' | 'Paid' | 'Closed' | 'ReviewRequired' | 'Reversed';

export interface OnlinePaymentComprobante {
  unitId: string;
  unitCode: string;
  expensePeriodId: string;
  periodYear: number;
  periodMonth: number;
  total: number;
  // Lo que se paga si se elige «hasta este comprobante»: la suma de este y de todos los anteriores.
  cumulativeTotal: number;
}

export interface OnlinePaymentConnectionOption {
  id: string;
  name: string;
  providerName: string;
  productName: string;
  // A nombre de quién se cobra: el propietario lo ve antes de pagar.
  holderName: string;
  holderTaxId: string;
  // Cobro de prueba: no se aplica a la deuda real de este edificio.
  isSimulated: boolean;
}

export interface OnlinePaymentBuildingOption {
  buildingId: string;
  buildingName: string;
  connections: OnlinePaymentConnectionOption[];
  comprobantes: OnlinePaymentComprobante[];
  // Si no puede pagar ahora (un pago declarado pendiente, un cobro en curso), por qué.
  blockedReason?: string | null;
  // Cobro en curso en este edificio: se retoma en vez de abrir otro.
  openPaymentId?: string | null;
}

export interface OnlinePaymentOptions {
  collectionEnabled: boolean;
  buildings: OnlinePaymentBuildingOption[];
}

export interface CreateOnlinePaymentRequest {
  buildingId: string;
  connectionId?: string | null;
  throughUnitId: string;
  throughExpensePeriodId: string;
}

export interface OnlinePaymentItem {
  unitId: string;
  unitCode: string;
  expensePeriodId: string;
  periodYear: number;
  periodMonth: number;
  amount: number;
}

export interface OnlinePayment {
  id: string;
  number: number;
  buildingId: string;
  buildingName: string;
  amount: number;
  currency: string;
  status: OnlinePaymentStatus;
  closeReason?: string | null;
  reviewReason?: string | null;
  holderName: string;
  holderTaxId: string;
  isSimulated: boolean;
  expiresAtUtc?: string | null;
  createdAtUtc: string;
  connectionName: string;
  attemptStatus?: string | null;
  // Dónde paga el propietario. Solo mientras el intento espera el pago.
  checkoutUrl?: string | null;
  ownerPaymentId?: string | null;
  ownerPaymentReference?: string | null;
  items: OnlinePaymentItem[];
}
