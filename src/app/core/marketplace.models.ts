// Marketplace de espacios temporales (propietario). Los mismos nombres que devuelve la API.

// Edificio del usuario con el marketplace disponible. canPublish: es propietario principal de alguna unidad.
export interface MarketplaceBuilding {
  buildingId: string;
  buildingName: string;
  canPublish: boolean;
}

// Unidad que el usuario puede publicar (de la que es propietario principal).
export interface MarketplacePublishableUnit {
  unitId: string;
  code: string;
  floor: string;
}

export type MarketplaceListingStatus = 'Active' | 'Suspended' | 'Closed';

export interface MarketplaceListing {
  id: string;
  buildingId: string;
  unitId: string;
  unitCode: string;
  ownerId: string;
  ownerName: string;
  title: string;
  windowStartUtc: string;
  windowEndUtc: string;
  windowHours: number;
  hourlyPrice: number;
  status: MarketplaceListingStatus;
  statusReason: string | null;
  // La ventana ya terminó (aunque el estado todavía no se haya cerrado).
  windowEnded: boolean;
  activeReservations: number;
  createdAtUtc: string;
}

export interface MarketplaceListingUpdateRequest {
  title: string;
  windowStartUtc: string;
  windowEndUtc: string;
  hourlyPrice: number;
}

export interface MarketplaceListingCreateRequest extends MarketplaceListingUpdateRequest {
  buildingId: string;
  unitId: string;
}

// ── Explorar y reservar ───────────────────────────────────────────────────────

export interface MarketplaceInterval {
  startUtc: string;
  endUtc: string;
}

// Publicación de otro vecino que se puede reservar, con lo que ya está ocupado.
export interface MarketplaceExploreItem {
  listingId: string;
  title: string;
  unitCode: string;
  windowStartUtc: string;
  windowEndUtc: string;
  hourlyPrice: number;
  // Comisión de gestión del edificio (se muestra en el desglose).
  commissionPercent: number;
  occupied: MarketplaceInterval[];
}

export interface MarketplaceQuoteRequest {
  listingId: string;
  startsAtUtc: string;
  endsAtUtc: string;
}

// Desglose que calcula siempre el servidor.
export interface MarketplaceQuote {
  listingId: string;
  startsAtUtc: string;
  endsAtUtc: string;
  hours: number;
  hourlyPrice: number;
  baseAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  totalAmount: number;
}

export type MarketplaceReservationStatus =
  'PendingPayment' | 'InReview' | 'Confirmed' | 'Completed' | 'Cancelled' | 'Expired' | 'Rejected';

export interface MarketplaceReservation {
  id: string;
  reference: string;
  listingId: string;
  buildingId: string;
  title: string;
  unitCode: string;
  startsAtUtc: string;
  endsAtUtc: string;
  hours: number;
  hourlyPrice: number;
  baseAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  totalAmount: number;
  status: MarketplaceReservationStatus;
  // Solo mientras espera el pago: hasta cuándo puede pagar.
  expiresAtUtc: string | null;
  cancelReason: string | null;
  createdAtUtc: string;
}

// ── Pago y revisión ───────────────────────────────────────────────────────────

// Lo que necesita el comprador para pagar. Los datos para transferir solo vienen mientras la reserva espera el pago.
export interface MarketplacePaymentInfo {
  reservationId: string;
  reference: string;
  title: string;
  totalAmount: number;
  expiresAtUtc: string | null;
  transferInfo: string;
}

// Pago esperando revisión (lo ve solo el personal del edificio).
export interface MarketplaceReviewItem {
  paymentId: string;
  reservationId: string;
  buildingId: string;
  reference: string;
  title: string;
  unitCode: string;
  ownerName: string;
  buyerName: string;
  buyerUnits: string;
  // Aviso solo para quien revisa: alguna unidad del comprador tiene pagos atrasados.
  buyerUnitOverdue: boolean;
  startsAtUtc: string;
  endsAtUtc: string;
  hours: number;
  baseAmount: number;
  commissionAmount: number;
  expectedAmount: number;
  comprobanteUrl: string;
  submittedAtUtc: string;
  status: 'Submitted' | 'Approved' | 'Rejected';
  rejectionReason: string | null;
  // La reserva ya terminó: ya no se puede aprobar (solo rechazar).
  reservationEnded: boolean;
}

// Edificio del personal (Encargado) con el marketplace disponible y lo que su rol puede hacer ahí.
export interface MarketplaceStaffBuilding {
  buildingId: string;
  buildingName: string;
  canReviewPayments: boolean;
  canViewAccount: boolean;
  canEditAccount: boolean;
}
