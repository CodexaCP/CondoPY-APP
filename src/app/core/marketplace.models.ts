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

  // Fase 7: lo que el comprador puede hacer y cómo van su reclamo y su reembolso (los decide el servidor).
  // Cancelar: sin pagar (sin costo) o confirmada y antes del inicio (la comisión no se devuelve).
  canCancel: boolean;
  // "Reportar un problema": desde que empieza hasta 24 horas después de su fin.
  canReportProblem: boolean;
  // Llegó el aviso de inicio y todavía no respondió.
  needsStartResponse: boolean;
  startResponse: 'Attending' | 'NotUsing' | null;
  claimStatus: MarketplaceClaimStatus | null;
  claimResolution: MarketplaceClaimResolution | null;
  claimResolutionNote: string | null;
  refundAmount: number | null;
  refundStatus: 'Pending' | 'Returned' | null;
  // Hasta cuándo se le devuelve (72 horas desde que se creó el reembolso).
  refundDueAtUtc: string | null;
}

export type MarketplaceClaimStatus = 'Open' | 'Resolved';
export type MarketplaceClaimResolution = 'InFavorOfOwner' | 'InFavorOfBuyer';

// Reserva en una de MIS publicaciones: quién reservó (solo nombre y unidad) y lo que voy a recibir.
export interface MarketplaceOwnerReservation {
  id: string;
  reference: string;
  listingId: string;
  buildingId: string;
  title: string;
  unitCode: string;
  buyerName: string;
  buyerUnits: string;
  startsAtUtc: string;
  endsAtUtc: string;
  hours: number;
  ownerNetAmount: number;
  status: MarketplaceReservationStatus;
  creditStatus: 'None' | 'Pending' | 'Held' | 'Credited' | 'Reversed';
  creditedAtUtc: string | null;
  cancelReason: string | null;
  canCancel: boolean;
  canReportProblem: boolean;
  claimStatus: MarketplaceClaimStatus | null;
  claimResolution: MarketplaceClaimResolution | null;
  claimResolutionNote: string | null;
  createdAtUtc: string;
}

// Lo que pasa si cancelo, calculado por el servidor para avisarlo antes de confirmar.
export interface MarketplaceCancelPreview {
  reservationId: string;
  role: 'Buyer' | 'Owner';
  canCancel: boolean;
  blockedReason: string | null;
  // Comprador: solo la base. Propietario: se le devuelve todo al comprador.
  refundAmount: number;
  // Comprador: comisión que NO se devuelve. Propietario: comisión que asume.
  commissionAmount: number;
  requiresReason: boolean;
  beforePayment: boolean;
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

// ── Seguimiento del Encargado: reembolsos y reclamos ──────────────────────────

// Reembolso pendiente al comprador: se devuelve fuera del sistema y se marca "devuelto".
export interface MarketplaceRefund {
  id: string;
  reservationId: string;
  buildingId: string;
  reference: string;
  title: string;
  unitCode: string;
  buyerName: string;
  amount: number;
  origin: 'BuyerCancellation' | 'OwnerCancellation' | 'ClaimResolution';
  reason: string;
  status: 'Pending' | 'Returned';
  createdAtUtc: string;
  // Plazo máximo para devolver (72 horas desde que se creó).
  dueAtUtc: string;
  overdue: boolean;
  returnedAtUtc: string | null;
  returnedByName: string | null;
}

// "Reportar un problema", con lo necesario para decidir.
export interface MarketplaceClaim {
  id: string;
  reservationId: string;
  buildingId: string;
  reference: string;
  title: string;
  unitCode: string;
  ownerName: string;
  buyerName: string;
  buyerUnits: string;
  startsAtUtc: string;
  endsAtUtc: string;
  baseAmount: number;
  commissionAmount: number;
  totalAmount: number;
  openedBy: 'Buyer' | 'Owner';
  openedByName: string;
  reason: string;
  status: MarketplaceClaimStatus;
  resolution: MarketplaceClaimResolution | null;
  resolutionNote: string | null;
  createdAtUtc: string;
  resolvedAtUtc: string | null;
  buyerStartResponse: 'Attending' | 'NotUsing' | null;
  buyerStartResponseReason: string | null;
}
