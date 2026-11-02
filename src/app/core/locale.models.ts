// Configuración regional de la empresa del usuario (país, moneda, impuesto, vocabulario y capacidades).
// La trae el login (LoginResponse.locale) y se refresca con GET /api/locale/me.
export interface CountryDocumentType {
  code: string;
  label: string;
  isTaxId: boolean;
}

export interface CountryCapabilities {
  emitsInvoices: boolean;
  onlinePayments: boolean;
  purchaseTaxBook: boolean;
  paymentsInOtherCurrency: boolean;
}

export type CapabilityName = keyof CountryCapabilities;

export interface CompanyLocale {
  countryCode: string;
  countryName: string;
  isDraftCountry: boolean;
  currencyCode: string;
  currencySymbol: string;
  currencyDecimals: number;
  groupSeparator: string;
  decimalSeparator: string;
  localeCode: string;
  timeZoneId: string;
  phonePrefix: string;
  taxName: string;
  taxGeneralRate: number | null;
  taxReducedRate: number | null;
  taxIdLabel: string;
  regionLabel: string;
  jurisdictions: string[];
  documentTypes: CountryDocumentType[];
  capabilities: CountryCapabilities;
  glossary: Record<string, string>;
  buildingFieldLabels: Record<string, string>;
}
