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
  condominiumId: string;
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
