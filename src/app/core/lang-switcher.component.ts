import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { LANGS, Lang, LangService } from './lang.service';

// Selector de idioma ES · PT · EN para las pantallas sin sesión.
@Component({
  selector: 'app-lang-switcher',
  standalone: true,
  imports: [NgFor],
  template: `
    <div class="ls" role="group" aria-label="Idioma / Language">
      <button type="button" *ngFor="let l of langs" [class.on]="l.code === lang.lang" [attr.lang]="l.code" [attr.aria-pressed]="l.code === lang.lang" [title]="l.label" (click)="pick(l.code)">{{ l.short }}</button>
    </div>
  `,
  styles: [`
    :host { display: inline-block; }
    .ls { display: inline-flex; border: 1.5px solid currentColor; border-radius: 999px; overflow: hidden; opacity: 0.95; }
    .ls button { font: inherit; font-size: 0.72rem; font-weight: 800; letter-spacing: 0.04em; padding: 0.28rem 0.6rem; border: 0; background: transparent; color: inherit; cursor: pointer; }
    .ls button.on { background: currentColor; }
    .ls button.on { color: var(--ls-on, #fff); mix-blend-mode: normal; }
  `]
})
export class LangSwitcherComponent {
  readonly langs = LANGS;
  constructor(public lang: LangService) {}

  pick(code: Lang): void {
    this.lang.choose(code);
  }
}
