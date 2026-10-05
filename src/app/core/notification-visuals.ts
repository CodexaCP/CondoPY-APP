// Ícono y color de cada tipo de notificación. Lo comparten la lista de Notificaciones y el aviso en pantalla
// (NotificationAlertService), para que un mismo tipo se vea igual en los dos lados.
// Los tipos son los de Condo.Domain/Enums/NotificationType.cs: si el backend suma uno, se agrega acá.

export type NotificationTone = 'ok' | 'warn' | 'bad' | 'info' | 'plan' | 'brand' | 'teal' | 'violet';

export const TONE_COLOR: Record<NotificationTone, string> = {
  ok:     '#22c55e',
  warn:   '#f59e0b',
  bad:    '#ef4444',
  info:   '#3b82f6',
  plan:   '#f97316',
  brand:  '#6366f1',
  teal:   '#14b8a6',
  violet: '#8b5cf6'
};

export interface NotificationVisual {
  icon: string;
  tone: NotificationTone;
}

const DEFAULT_VISUAL: NotificationVisual = { icon: 'notifications-outline', tone: 'info' };

const VISUALS: Record<string, NotificationVisual> = {
  // Pagos de expensas
  OwnerPaymentSubmitted:    { icon: 'cloud-upload-outline',      tone: 'warn' },
  PaymentUnderReview:       { icon: 'search-outline',            tone: 'info' },
  PaymentApproved:          { icon: 'checkmark-circle-outline',  tone: 'ok' },
  PaymentRejected:          { icon: 'close-circle-outline',      tone: 'bad' },
  LateFeeConfigChanged:     { icon: 'alert-circle-outline',      tone: 'plan' },
  // Facturas y notas de crédito
  InvoiceIssued:            { icon: 'document-text-outline',     tone: 'info' },
  CreditNoteApproved:       { icon: 'receipt-outline',           tone: 'ok' },
  // Liquidación de expensas
  ExpensePeriodPublished:   { icon: 'receipt-outline',           tone: 'brand' },
  ExpensePeriodUnpublished: { icon: 'arrow-undo-outline',        tone: 'warn' },
  SettlementRejected:       { icon: 'close-circle-outline',      tone: 'bad' },
  SettlementPendingPresidentReview: { icon: 'create-outline',    tone: 'violet' },
  SettlementRejectedByPresident:    { icon: 'close-circle-outline', tone: 'bad' },
  SettlementApprovedByPresident:    { icon: 'checkmark-circle-outline', tone: 'ok' },
  // Comunicados, votaciones y reclamos
  AnnouncementPublished:    { icon: 'megaphone-outline',         tone: 'brand' },
  VoteOpened:               { icon: 'checkbox-outline',          tone: 'violet' },
  ClaimCreated:             { icon: 'chatbubble-ellipses-outline', tone: 'info' },
  ClaimStatusUpdated:       { icon: 'chatbubble-ellipses-outline', tone: 'info' },
  // Reservas de áreas comunes
  AmenityReservationCreated: { icon: 'calendar-outline',         tone: 'teal' },
  AmenityReservationUpdated: { icon: 'calendar-outline',         tone: 'teal' },
  // Plan del edificio
  PlanExpiringSoon:         { icon: 'time-outline',              tone: 'warn' },
  PlanExpired:              { icon: 'alert-circle-outline',      tone: 'plan' },
  PlanSuspended:            { icon: 'lock-closed-outline',       tone: 'bad' },
  // Ajuste de un gasto por nota de crédito del proveedor (saldo a favor)
  SupplierCreditApplied:    { icon: 'wallet-outline',            tone: 'ok' },
  // Marketplace
  MarketplaceReservationExpired:   { icon: 'time-outline',            tone: 'plan' },
  MarketplacePaymentPending:       { icon: 'cash-outline',            tone: 'warn' },
  MarketplaceReservationConfirmed: { icon: 'checkmark-circle-outline', tone: 'ok' },
  MarketplaceReservationRejected:  { icon: 'close-circle-outline',    tone: 'bad' },
  MarketplaceNewReservation:       { icon: 'storefront-outline',      tone: 'teal' },
  MarketplaceCreditApplied:        { icon: 'wallet-outline',          tone: 'ok' },
  MarketplaceCreditReversed:       { icon: 'wallet-outline',          tone: 'warn' },
  MarketplaceReservationCancelled: { icon: 'close-circle-outline',    tone: 'bad' },
  MarketplaceRefundPending:        { icon: 'return-down-back-outline', tone: 'warn' },
  MarketplaceRefundReturned:       { icon: 'checkmark-done-outline',  tone: 'ok' },
  MarketplaceRefundOverdue:        { icon: 'alert-circle-outline',    tone: 'bad' },
  MarketplaceClaimOpened:          { icon: 'flag-outline',            tone: 'plan' },
  MarketplaceClaimResolved:        { icon: 'flag-outline',            tone: 'ok' },
  MarketplaceStartNotice:          { icon: 'alarm-outline',           tone: 'info' },
  MarketplaceHandoverNote:         { icon: 'swap-horizontal-outline', tone: 'violet' }
};

export function notificationVisual(type: string | null | undefined): NotificationVisual {
  return (type && VISUALS[type]) || DEFAULT_VISUAL;
}

export function notificationColor(type: string | null | undefined): string {
  return TONE_COLOR[notificationVisual(type).tone];
}
