import { Injectable } from '@angular/core';

export type Lang = 'es' | 'pt' | 'en';

export const LANGS: { code: Lang; label: string; short: string; locale: string }[] = [
  { code: 'es', label: 'Español', short: 'ES', locale: 'es-PY' },
  { code: 'pt', label: 'Português', short: 'PT', locale: 'pt-BR' },
  { code: 'en', label: 'English', short: 'EN', locale: 'en-GB' }
];

// Un texto por idioma: cada pantalla sin sesión define uno y el compilador exige que estén los tres completos.
export type Dict<T> = Record<Lang, T>;

const KEY = 'expenses-app-lang';

const isLang = (v: unknown): v is Lang => v === 'es' || v === 'pt' || v === 'en';

// Idioma de las pantallas que se ven sin iniciar sesión (ingreso, recuperar contraseña y demo del Encargado).
// Primero lo que la persona eligió con el selector; si nunca eligió, el idioma del teléfono (español, portugués o inglés); si no, español.
@Injectable({ providedIn: 'root' })
export class LangService {
  lang: Lang = this.initial();

  get locale(): string {
    return LANGS.find((l) => l.code === this.lang)?.locale ?? 'es-PY';
  }

  choose(lang: Lang): void {
    this.lang = lang;
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      // Sin almacenamiento: el idioma dura mientras la app siga abierta.
    }
    document.documentElement.setAttribute('lang', lang);
  }

  private initial(): Lang {
    let lang: Lang = 'es';
    try {
      const saved = localStorage.getItem(KEY);
      if (isLang(saved)) {
        lang = saved;
      } else {
        const list = navigator.languages?.length ? navigator.languages : [navigator.language];
        const found = list.map((l) => (l ?? '').slice(0, 2).toLowerCase()).find(isLang);
        if (found) lang = found;
      }
    } catch {
      // Se queda en español.
    }
    document.documentElement.setAttribute('lang', lang);
    return lang;
  }
}
