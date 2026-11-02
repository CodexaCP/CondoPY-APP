import { Component } from '@angular/core';
import { term } from '../../core/locale.util';

@Component({
  selector: 'app-tabs',
  templateUrl: './tabs.page.html',
  standalone: false,
})
export class TabsPage {
  // Vocabulario del país de la empresa (expensas, gastos comunes...).
  get expensasLabel(): string { return term('expensas', 'Expensas'); }
}
