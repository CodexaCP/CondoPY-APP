import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { formatMiles, parseMiles } from './amount.util';

// Campo de importe en guaraníes con separador de miles mientras se escribe: "1250000" se ve "1.250.000".
// Entrega el número entero (o null si está vacío) por valueChange. Con allowNegative acepta un "-" al inicio (saldos de extracto).
@Component({
  selector: 'app-amount-input',
  standalone: false,
  template: `
    <ion-input type="text" inputmode="numeric" fill="outline" autocomplete="off"
               [label]="label" labelPlacement="stacked" [placeholder]="placeholder" [disabled]="disabled"
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

  // Si el valor cambia desde afuera (precarga, limpiar) se redibuja; lo que escribe la persona no se pisa.
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && parseMiles(this.display, this.allowNegative) !== this.value) {
      this.display = this.value === null ? '' : formatMiles(this.value);
    }
  }

  onInput(event: Event): void {
    const input = event.target as HTMLIonInputElement;
    const raw = String((event as CustomEvent).detail?.value ?? '');
    const num = parseMiles(raw, this.allowNegative);
    // Un "-" solo, a medio escribir, se deja ver; cualquier otra cosa sin dígitos queda vacía.
    const formatted = num === null ? (this.allowNegative && raw.trim() === '-' ? '-' : '') : formatMiles(num);

    this.display = formatted;
    if (input.value !== formatted) input.value = formatted;
    this.valueChange.emit(num);
  }
}
