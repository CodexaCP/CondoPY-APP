import { Component } from '@angular/core';
import { ActionSheetController } from '@ionic/angular';
import { BuildingContextService } from '../../core/building-context.service';

// Chip con el edificio seleccionado. Si el Encargado tiene más de uno, al tocarlo se elige otro.
// Con un solo edificio muestra el nombre sin selector.
@Component({
  selector: 'app-building-switcher',
  standalone: false,
  template: `
    <button *ngIf="ctx.selected$ | async as selected" type="button" class="bs-chip"
            [class.bs-single]="!multiple" (click)="open()">
      <ion-icon name="business-outline"></ion-icon>
      <span class="bs-name">{{ selected.name }}</span>
      <ion-icon *ngIf="multiple" name="chevron-down-outline" class="bs-caret"></ion-icon>
    </button>
  `,
  styles: [`
    .bs-chip {
      display: inline-flex; align-items: center; gap: 0.35rem; max-width: 100%;
      background: rgba(255, 255, 255, 0.18); color: #fff; border: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 999px; padding: 0.3rem 0.75rem; font-size: 0.78rem; font-weight: 700;
    }
    .bs-chip.bs-single { pointer-events: none; }
    .bs-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 52vw; }
    .bs-caret { font-size: 0.9rem; }
  `]
})
export class BuildingSwitcherComponent {
  constructor(public ctx: BuildingContextService, private sheets: ActionSheetController) {}

  get multiple(): boolean { return this.ctx.buildings.length > 1; }

  async open(): Promise<void> {
    const buildings = this.ctx.buildings;
    if (buildings.length < 2) return;

    const sheet = await this.sheets.create({
      header: 'Elegí el edificio',
      buttons: [
        ...buildings.map(b => ({
          text: b.name,
          role: b.id === this.ctx.selectedId ? 'selected' : undefined,
          handler: () => this.ctx.select(b.id)
        })),
        { text: 'Cancelar', role: 'cancel' }
      ]
    });
    await sheet.present();
  }
}
