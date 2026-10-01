import { OwnerPaymentStatus } from './models';
import { ManagerPlanStatus } from './plan-gate.service';

// Modelos de la sección del Encargado (ver docs/ESPECIFICACION_APP_ENCARGADO.md en el repo del backend).

export interface ManagerBuilding {
  id: string;
  name: string;
  code: string;
  address: string;
  isActive: boolean;
}

export interface ManagerSummary {
  buildingId: string;
  buildingName: string;
  pendingOwnerPayments: number;
  underReviewOwnerPayments: number;
  pendingClaims: number;
  inProgressClaims: number;
  pendingReservations: number;
  currentPeriod: { id: string; name: string; status: string; dueDate: string } | null;
  currentPeriodCharged: number;
  currentPeriodCollected: number;
  collectionRatePercentage: number;
  overdueBalance: number;
  unitsInArrears: number;
  plan: {
    name: string;
    status: ManagerPlanStatus;
    endDate: string;
    daysUntilExpiry: number;
    daysUntilBlocked: number | null;
  } | null;
}

// Pago de propietario visto por el Encargado (incluye canProcess).
export interface ManagerOwnerPayment {
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
  reviewedByUserFullName: string | null;
  reviewedAt: string | null;
  resolvedAt: string | null;
  createdAtUtc: string;
  units: { unitId: string; unitCode: string; buildingName: string; allocatedAmount: number }[];
  canProcess: boolean;
}

export interface ManagerPage<T> {
  items: T[];
  total: number;
}

export interface ManagerPlan {
  id: string;
  buildingId: string;
  buildingName: string;
  planName: string;
  startDate: string;
  endDate: string;
  hasRenewal: boolean;
  isPaid: boolean;
  status: ManagerPlanStatus;
  daysUntilExpiry: number;
  daysUntilBlocked: number | null;
}

export interface ManagerPlanPayment {
  id: string;
  buildingPlanId: string;
  declaredAmount: number;
  paymentDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  rejectionReason: string;
  createdAtUtc: string;
}

export interface ManagerPlanPaymentRequest {
  buildingPlanId: string;
  declaredAmount: number;
  paymentDate: string;
  comprobanteUrl: string | null;
  reference: string | null;
}

export interface AppVersionInfo {
  minVersionCode: number;
  latestVersionCode: number;
  apkUrl: string;
  message?: string | null;
}
