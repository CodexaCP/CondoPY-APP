import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { LANGS, Lang, LangService } from './lang.service';

// Selector de idioma de las pantallas sin sesión: lista desplegable (español, portugués, inglés).
@Component({
  selector: 'app-lang-switcher',
  standalone: true,
  imports: [NgFor],
  template: `
    <label class="ls">
      <span aria-hidden="true">🌐</span>
      <select aria-label="Idioma / Language" (change)="pick($any($event.target).value)">
        <option *ngFor="let l of langs" [value]="l.code" [selected]="l.code === lang.lang" [attr.lang]="l.code">{{ l.label }}</option>
      </select>
    </label>
  `,
  styles: [`
    :host { display: inline-block; }
    .ls { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0 0.35rem 0 0.6rem; border: 1.5px solid currentColor; border-radius: 999px; color: inherit; font-size: 0.85rem; }
    select { font: inherit; font-size: 0.78rem; font-weight: 800; padding: 0.3rem 0.2rem; border: 0; background: transparent; color: inherit; outline: none; cursor: pointer; }
    select option { color: #16324a; background: #fff; }
  `]
})
export class LangSwitcherComponent {
  readonly langs = LANGS;
  constructor(public lang: LangService) {}

  pick(code: Lang): void {
    this.lang.choose(code);
  }
}
