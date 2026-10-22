// Conciliación bancaria (api/finance/reconciliation). Mismos nombres que devuelve el backend.

export type ReconciliationStatus = 'Open' | 'Completed';
export type LedgerSourceType = 'OwnerPayment' | 'BuildingExpense' | 'BuildingIncome' | 'SupplierCreditNote' | 'OpeningBalance' | 'Transfer';
export type AccountType = 'Cash' | 'Bank' | 'ReserveFund' | 'Clearing';

export interface ReconciliationAccount {
  accountId: string;
  accountName: string;
  accountType: AccountType;
  isActive: boolean;
  // Saldo del libro a hoy.
  bookBalance: number;
  lastCompletedDate: string | null;
  lastStatementBalance: number | null;
  openReconciliationId: string | null;
  openStatementDate: string | null;
}

export interface ReconciliationOverview {
  buildingId: string;
  // El usuario puede armar, cerrar y reabrir (SuperAdmin, Administrador, o Encargado si el edificio lo habilitó).
  canEdit: boolean;
  managerCanReconcile: boolean;
  canConfigure: boolean;
  accounts: ReconciliationAccount[];
}

export interface ReconciliationSummary {
  id: string;
  accountId: string;
  accountName: string;
  statementDate: string;
  statementBalance: number;
  status: ReconciliationStatus;
  completedAtUtc: string | null;
  completedByName: string | null;
  reconciledBalanceAtCompletion: number | null;
  markedCount: number;
  notes: string | null;
}

export interface ReconciliationMovement {
  sourceType: LedgerSourceType;
  sourceId: string;
  date: string;
  description: string;
  thirdParty: string;
  reference: string;
  // Con signo: entradas positivas y salidas negativas.
  amount: number;
  direction: 'In' | 'Out';
  isMarked: boolean;
  inThisReconciliation: boolean;
  // Ok, Changed (el importe cambió después de tildarlo) o Missing (ya no figura en el libro).
  state: 'Ok' | 'Changed' | 'Missing';
  markedAmount: number | null;
  markedAtUtc: string | null;
  markedByName: string | null;
}

export interface ReconciliationWorkspace {
  id: string;
  buildingId: string;
  accountId: string;
  accountName: string;
  statementDate: string;
  statementBalance: number;
  notes: string | null;
  status: ReconciliationStatus;
  canEdit: boolean;
  openingBalance: number;
  bookBalance: number;
  reconciledBalance: number;
  // Saldo del extracto menos el saldo conciliado. Cero = conciliada.
  difference: number;
  isBalanced: boolean;
  pendingIn: number;
  pendingOut: number;
  pendingCount: number;
  pendingTruncated: boolean;
  changedCount: number;
  missingCount: number;
  alerts: string[];
  marked: ReconciliationMovement[];
  pending: ReconciliationMovement[];
  previousMarkedCount: number;
  previousMarkedAmount: number;
}

export interface StartReconciliationRequest {
  buildingId: string;
  accountId: string;
  statementDate: string;
  statementBalance: number;
  notes: string | null;
}

export interface UpdateReconciliationRequest {
  statementDate: string;
  statementBalance: number;
  notes: string | null;
}

export interface ReconciliationItemRef {
  sourceType: LedgerSourceType;
  sourceId: string;
}
