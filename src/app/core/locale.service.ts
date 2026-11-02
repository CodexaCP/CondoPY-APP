import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { CapabilityName, CompanyLocale, CountryDocumentType } from './locale.models';
import {
  currencySymbol, currentLocale, documentTypes, formatMoney, formatMoneyNumber, hasCapability, resetLocaleCache, term
} from './locale.util';

const USER_KEY = 'condopy_user';

// Acceso inyectable a la configuración regional de la sesión, para plantillas y componentes. Las funciones planas de locale.util
// hacen lo mismo para los utilitarios que no usan inyección.
@Injectable({ providedIn: 'root' })
export class LocaleService {
  constructor(private http: HttpClient) {}

  get locale(): CompanyLocale { return currentLocale(); }
  get documentTypes(): CountryDocumentType[] { return documentTypes(); }
  get currencySymbol(): string { return currencySymbol(); }
  get currencyDecimals(): number { return currentLocale().currencyDecimals; }

  money(value: number | null | undefined): string { return formatMoney(value); }
  moneyNumber(value: number | null | undefined): string { return formatMoneyNumber(value); }
  term(key: string, fallback: string): string { return term(key, fallback); }
  has(name: CapabilityName): boolean { return hasCapability(name); }

  /** Vuelve a pedir la configuración de la empresa y la guarda en la sesión activa (sin tocar el resto de la sesión). */
  refresh(): Observable<CompanyLocale> {
    return this.http.get<CompanyLocale>(`${environment.apiUrl}/locale/me`).pipe(
      tap(locale => {
        for (const storage of [localStorage, sessionStorage]) {
          const raw = storage.getItem(USER_KEY);
          if (!raw) continue;
          try {
            const user = JSON.parse(raw);
            user.locale = locale;
            storage.setItem(USER_KEY, JSON.stringify(user));
          } catch {
            // sesión ilegible: se ignora
          }
        }
        resetLocaleCache();
      })
    );
  }
}
