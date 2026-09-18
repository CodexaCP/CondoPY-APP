export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  mustChangePassword: boolean;
  userId: string;
  fullName: string;
  email: string;
  role: string;
}

export interface MyUnit {
  unitId: string;
  unitCode: string;
  floor: string;
  coefficient: number;
  buildingId: string;
  buildingName: string;
  buildingCode: string;
  buildingAddress: string;
  condominiumId: string;
  condominiumName: string;
  relationRole: string;
  isPrimary: boolean;
}

export interface AccountStatementPeriod {
  expensePeriodId: string;
  expensePeriodName: string;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  dueDate: string;
  status: string;
  totalCharges: number;
  totalPayments: number;
  balance: number;
  previousBalance: number;
  runningBalance: number;
}

export interface AccountStatementCharge {
  id: string;
  chargeType: string;
  concept: string;
  amount: number;
  notes: string;
  isReversal: boolean;
}

export interface AccountStatementPayment {
  id: string;
  paymentDate: string;
  amount: number;
  method: string;
  reference: string;
  notes: string;
  isReversed: boolean;
  reversedAt: string | null;
}

export interface AccountStatementDetail {
  unitId: string;
  unitCode: string;
  buildingId: string;
  buildingName: string;
  expensePeriodId: string;
  expensePeriodName: string;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  dueDate: string;
  status: string;
  charges: AccountStatementCharge[];
  payments: AccountStatementPayment[];
  totalCharges: number;
  totalPayments: number;
  balance: number;
}

export type ClaimCategory = 'Ruido' | 'Limpieza' | 'Mantenimiento' | 'Otro';
export type ClaimStatus = 'Pendiente' | 'EnProceso' | 'Resuelto';

export interface Claim {
  id: string;
  condominiumId: string | null;
  condominiumName: string;
  buildingId: string;
  buildingName: string;
  unitId: string;
  unitCode: string;
  category: ClaimCategory;
  description: string;
  status: ClaimStatus;
  createdByUserId: string;
  createdByName: string;
  createdAtUtc: string;
  updatedAtUtc: string;
  resolvedAtUtc: string | null;
  resolvedByUserId: string | null;
  resolvedByUserName: string;
}

export interface CreateClaimRequest {
  unitId: string;
  category: ClaimCategory;
  description: string;
}

// ── Owner Payments ────────────────────────────────────────────────────────────

export type OwnerPaymentStatus = 'Pending' | 'UnderReview' | 'Approved' | 'Rejected';

export interface OwnerPayment {
  id: string;
  reference: string;
  ownerId: string;
  ownerFullName: string;
  paymentDate: string;
  comprobanteUrl: string | null;
  declaredAmount: number;
  reviewedAmount: number | null;
  status: OwnerPaymentStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  resolvedAt: string | null;
  createdAtUtc: string;
  units: OwnerPaymentUnit[];
  applications?: OwnerPaymentApplication[];
}

export interface OwnerPaymentApplication {
  unitCode: string;
  concept: string;
  periodYear: number;
  periodMonth: number;
  amount: number;
}

export interface OwnerPaymentUnit {
  unitId: string;
  unitCode: string;
  allocatedAmount: number;
}

export interface OwnerPaymentCreateRequest {
  unitIds: string[];
  paymentDate: string;
  declaredAmount: number;
  comprobanteUrl: string | null;
}

export interface OwnerDebtCharge {
  chargeId: string;
  concept: string;
  chargeType: string;
  periodYear: number;
  periodMonth: number;
  amount: number;
  pendingAmount: number;
}

export interface OwnerDebtUnit {
  unitId: string;
  unitCode: string;
  buildingName: string;
  totalDebt: number;
  charges: OwnerDebtCharge[];
}

// ── Announcements ─────────────────────────────────────────────────────────────

export type AnnouncementCategory = 'General' | 'Mantenimiento' | 'Seguridad' | 'Financiero' | 'Convocatoria' | 'Otro';

export interface Announcement {
  id: string;
  buildingId: string;
  buildingName: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  publishedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdByUserId: string | null;
  createdByName: string;
  createdAtUtc: string;
  updatedAtUtc: string;
}

// ── Notifications ─────────────────────────────────────────────────────────────

export type NotificationType =
  | 'OwnerPaymentSubmitted'
  | 'PaymentUnderReview'
  | 'PaymentApproved'
  | 'PaymentRejected'
  | 'LateFeeConfigChanged'
  | 'AmenityReservationUpdated'
  | 'AnnouncementPublished'
  | 'ClaimCreated'
  | 'ClaimStatusUpdated'
  | 'AmenityReservationCreated'
  | 'VoteOpened'
  | 'ExpensePeriodPublished';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  entityType: string | null;
  entityId: string | null;
  createdAtUtc: string;
}

// ── Amenities ──────────────────────────────────────────────────────────

export type AmenityReservationStatus = 'PendingPayment' | 'PendingReview' | 'Confirmed' | 'Rejected' | 'Cancelled';

export interface Amenity {
  id: string;
  buildingId: string;
  buildingName: string;
  name: string;
  description: string;
  reservationPrice: number;
  isActive: boolean;
}

export interface AmenityScheduleSlot {
  startsAt: string;
  endsAt: string;
  status: AmenityReservationStatus;
}

export interface AmenityReservation {
  id: string;
  amenityId: string;
  amenityName: string;
  buildingId: string;
  buildingName: string;
  startsAt: string;
  endsAt: string;
  price: number;
  status: AmenityReservationStatus;
  notes: string;
  comprobanteUrl: string | null;
  reservedByName: string;
  rejectionReason: string | null;
  createdAtUtc: string;
}
