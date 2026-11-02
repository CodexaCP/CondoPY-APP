import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { currencySymbol, currentLocale, parseAmountInput } from '../../core/locale.util';
import { formatMiles, parseMiles } from './amount.util';

// Campo de importe en la moneda de la empresa con separador de miles mientras se escribe: "1250000" se ve "1.250.000".
// Entrega el número (entero en guaraníes, con centavos si la moneda los tiene; null si está vacío) por valueChange. Con allowNegative acepta un "-" al inicio (saldos de extracto).
@Component({
  selector: 'app-amount-input',
  standalone: false,
  template: `
    <ion-input type="text" [attr.inputmode]="inputMode" fill="outline" autocomplete="off"
               [label]="shownLabel" labelPlacement="stacked" [placeholder]="placeholder" [disabled]="disabled"
               [value]="display" (ionInput)="onInput($event)"></ion-input>
  `
})
export class AmountInputComponent implements OnChanges {
  @Input() label = '';
  @Input() placeholder = '0';
  @Input() allowNegative = false;
  @Input() disabled = false;
  @Input() value: number | null = null;
  @Output() valueChange = new EventEmitter<number | null>();

  display = '';

  // Las etiquetas escritas con "(Gs.)" muestran el símbolo de la moneda de la empresa.
  get shownLabel(): string { return this.label.replace('(Gs.)', `(${currencySymbol()})`); }

  get inputMode(): string { return currentLocale().currencyDecimals > 0 ? 'decimal' : 'numeric'; }

  // Si el valor cambia desde afuera (precarga, limpiar) se redibuja; lo que escribe la persona no se pisa.
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && parseMiles(this.display, this.allowNegative) !== this.value) {
      this.display = this.value === null ? '' : formatMiles(this.value);
    }
  }

  onInput(event: Event): void {
    const input = event.target as HTMLIonInputElement;
    const raw = String((event as CustomEvent).detail?.value ?? '');
    const { value: num, display } = parseAmountInput(raw, this.allowNegative);
    // Un "-" solo, a medio escribir, se deja ver; cualquier otra cosa sin dígitos queda vacía.
    const formatted = num === null ? (this.allowNegative && raw.trim() === '-' ? '-' : display) : display;

    this.display = formatted;
    if (input.value !== formatted) input.value = formatted;
    this.valueChange.emit(num);
  }
}
