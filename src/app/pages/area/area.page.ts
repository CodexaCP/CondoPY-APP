import { Component } from '@angular/core';
import { AuthService } from '../../core/auth.service';
import { canPayExpenses } from '../../core/roles';
import { term } from '../../core/locale.util';

@Component({
  selector: 'app-area',
  templateUrl: './area.page.html',
  standalone: false,
})
export class AreaPage {
  constructor(private auth: AuthService) {}

  // La pestaña «Pagos» es solo del propietario; el residente ve sus expensas pero no envía pagos.
  // Vocabulario del país de la empresa (expensas, gastos comunes...).
  get expensasLabel(): string { return term('expensas', 'Expensas'); }

  get canPay(): boolean { return canPayExpenses(this.auth.getUser()?.role); }
}
