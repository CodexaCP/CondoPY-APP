import { CapabilityName, CompanyLocale, CountryDocumentType } from './locale.models';

// Formato de importes, vocabulario y capacidades según el país de la empresa del usuario. Son funciones planas (sin inyección) para
// poder usarlas desde los utilitarios de las pantallas; la configuración se lee de la sesión guardada y se recuerda en memoria.

const USER_KEY = 'condopy_user';

// Paraguay: lo que la app escribía antes de ser multipaís.
export const DEFAULT_LOCALE: CompanyLocale = {
  countryCode: 'PY',
  countryName: 'Paraguay',
  isDraftCountry: false,
  currencyCode: 'PYG',
  currencySymbol: 'Gs.',
  currencyDecimals: 0,
  groupSeparator: '.',
  decimalSeparator: ',',
  localeCode: 'es-PY',
  timeZoneId: 'America/Asuncion',
  phonePrefix: '+595',
  taxName: 'IVA',
  taxGeneralRate: 10,
  taxReducedRate: 5,
  taxIdLabel: 'RUC',
  regionLabel: 'Departamento',
  jurisdictions: [],
  documentTypes: [
    { code: 'RUC', label: 'RUC', isTaxId: true },
    { code: 'CedulaParaguaya', label: 'Cédula paraguaya', isTaxId: false },
    { code: 'Pasaporte', label: 'Pasaporte', isTaxId: false },
    { code: 'Otro', label: 'Otro', isTaxId: false }
  ],
  capabilities: { emitsInvoices: true, onlinePayments: true, purchaseTaxBook: true, paymentsInOtherCurrency: false },
  glossary: {},
  buildingFieldLabels: {}
};

// Máximo de dígitos enteros de un importe tipeado (el backend acepta hasta 9.999.999.999.999).
const MAX_INT_DIGITS = 13;

let cached: CompanyLocale | null = null;

function readStoredLocale(): CompanyLocale | null {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const raw = storage.getItem(USER_KEY);
      if (!raw) continue;
      const locale = (JSON.parse(raw) as { locale?: CompanyLocale }).locale;
      if (locale?.currencyCode) return { ...DEFAULT_LOCALE, ...locale };
    } catch {
      // sesión ilegible: se usa la configuración por defecto
    }
  }
  return null;
}

/** Configuración regional vigente (la de la sesión; Paraguay si no hay sesión o no trae país). */
export function currentLocale(): CompanyLocale {
  return cached ??= readStoredLocale() ?? DEFAULT_LOCALE;
}

/** Hay que llamarla cuando cambia la sesión (login, logout, refresco del locale). */
export function resetLocaleCache(): void {
  cached = null;
}

function group(intDigits: string, separator: string): string {
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/** Importe sin símbolo con los separadores y decimales de la moneda: 1250000 -> "1.250.000". */
export function formatMoneyNumber(value: number | null | undefined): string {
  const c = currentLocale();
  const n = Number.isFinite(value as number) ? (value as number) : 0;
  const fixed = Math.abs(n).toFixed(c.currencyDecimals);
  const [int, dec] = fixed.split('.');
  const body = group(int, c.groupSeparator) + (dec ? c.decimalSeparator + dec : '');
  return (n < 0 && Number(fixed) !== 0 ? '-' : '') + body;
}

/** Redondea a la unidad mínima de la moneda (guaraní entero, o centavo si la moneda los tiene). */
export function roundMoney(value: number): number {
  const factor = Math.pow(10, currentLocale().currencyDecimals);
  return Math.round(value * factor) / factor;
}

/** Importe con símbolo: "Gs. 1.250.000" o "$ 1.250,50". */
export function formatMoney(value: number | null | undefined): string {
  return `${currentLocale().currencySymbol} ${formatMoneyNumber(value)}`;
}

/**
 * Importe tipeado: devuelve el número y cómo se ve con separador de miles mientras se escribe. En una moneda con decimales acepta el
 * separador decimal de la moneda y hasta sus decimales; en guaraníes solo enteros (como siempre).
 */
export function parseAmountInput(
  raw: string | null | undefined,
  allowNegative = false
): { value: number | null; display: string } {
  const c = currentLocale();
  const text = (raw ?? '').trim();
  const negative = allowNegative && text.startsWith('-');
  const hasDecimalSeparator = c.currencyDecimals > 0 && text.includes(c.decimalSeparator);

  let intPart = text;
  let decPart = '';
  if (hasDecimalSeparator) {
    const idx = text.indexOf(c.decimalSeparator);
    intPart = text.slice(0, idx);
    decPart = text.slice(idx + c.decimalSeparator.length).replace(/\D/g, '').slice(0, c.currencyDecimals);
  }
  const intDigits = intPart.replace(/\D/g, '').slice(0, MAX_INT_DIGITS);

  if (!intDigits && !decPart) {
    return { value: null, display: hasDecimalSeparator ? `0${c.decimalSeparator}` : '' };
  }

  const magnitude = Number(`${intDigits || '0'}${decPart ? '.' + decPart : ''}`);
  const value = negative ? -magnitude : magnitude;
  const display = (negative ? '-' : '')
    + group(String(Number(intDigits || '0')), c.groupSeparator)
    + (hasDecimalSeparator ? c.decimalSeparator + decPart : '');
  return { value, display };
}

/** Texto del glosario del país (expensas, coeficiente, consorcio, unidad, presidente...); el fallback si no hay uno. */
export function term(key: string, fallback: string): string {
  return currentLocale().glossary?.[key] ?? fallback;
}

export function hasCapability(name: CapabilityName): boolean {
  return currentLocale().capabilities?.[name] ?? DEFAULT_LOCALE.capabilities[name];
}

export function documentTypes(): CountryDocumentType[] {
  return currentLocale().documentTypes?.length ? currentLocale().documentTypes : DEFAULT_LOCALE.documentTypes;
}

export function currencySymbol(): string {
  return currentLocale().currencySymbol;
}
