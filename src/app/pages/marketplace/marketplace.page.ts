import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ActionSheetController, AlertController, NavController, ToastController } from '@ionic/angular';
import { MarketplaceService } from '../../core/marketplace.service';
import { MarketplaceBuilding, MarketplaceListing } from '../../core/marketplace.models';
import { apiErrorMessage, formatCurrency, formatWindow, hoursLabel } from './marketplace.util';

type Tone = 'green' | 'amber' | 'grey';

@Component({
  selector: 'app-marketplace',
  templateUrl: './marketplace.page.html',
  styleUrls: ['./marketplace.page.scss'],
  standalone: false
})
export class MarketplacePage {
  loading = true;
  error = '';
  buildings: MarketplaceBuilding[] = [];
  selected: MarketplaceBuilding | null = null;
  listings: MarketplaceListing[] = [];
  busyId: string | null = null;

  readonly formatCurrency = formatCurrency;
  readonly formatWindow = formatWindow;
  readonly hoursLabel = hoursLabel;

  constructor(
    private readonly market: MarketplaceService,
    private readonly router: Router,
    private readonly navCtrl: NavController,
    private readonly alertCtrl: AlertController,
    private readonly actionSheetCtrl: ActionSheetController,
    private readonly toastCtrl: ToastController
  ) {}

  ionViewWillEnter(): void { this.load(); }

  load(event?: CustomEvent): void {
    this.error = '';
    this.market.loadBuildings(true).subscribe({
      next: buildings => {
        this.buildings = buildings;
        this.selected = this.market.selected;
        if (!this.selected) {
          this.loading = false;
          this.listings = [];
          (event as any)?.detail?.complete?.();
          return;
        }
        this.loadListings(event);
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudo cargar el Marketplace. Probá de nuevo.';
        (event as any)?.detail?.complete?.();
      }
    });
  }

  private loadListings(event?: CustomEvent): void {
    if (!this.selected) return;
    this.market.getMine(this.selected.buildingId).subscribe({
      next: items => {
        this.listings = items.filter(x => !(x.status === 'Closed'));
        this.loading = false;
        (event as any)?.detail?.complete?.();
      },
      error: err => {
        this.loading = false;
        this.error = apiErrorMessage(err, 'No se pudieron cargar tus publicaciones.');
        (event as any)?.detail?.complete?.();
      }
    });
  }

  async chooseBuilding(): Promise<void> {
    const sheet = await this.actionSheetCtrl.create({
      header: 'Elegí el edificio',
      buttons: [
        ...this.buildings.map(b => ({
          text: b.buildingName,
          handler: () => {
            this.market.select(b.buildingId);
            this.selected = b;
            this.loading = true;
            this.loadListings();
          }
        })),
        { text: 'Cancelar', role: 'cancel' }
      ]
    });
    await sheet.present();
  }

  publish(): void { this.router.navigateByUrl('/area/marketplace/new'); }
  edit(item: MarketplaceListing): void { this.router.navigateByUrl(`/area/marketplace/${item.id}/edit`); }

  // ── Estado que ve la gente ───────────────────────────────────────────────
  isEnded(item: MarketplaceListing): boolean { return item.windowEnded; }

  statusLabel(item: MarketplaceListing): string {
    if (item.windowEnded) return 'Finalizada';
    return item.status === 'Suspended' ? 'Pausada' : 'Activa';
  }

  statusTone(item: MarketplaceListing): Tone {
    if (item.windowEnded) return 'grey';
    return item.status === 'Suspended' ? 'amber' : 'green';
  }

  canEdit(item: MarketplaceListing): boolean { return !item.windowEnded; }

  // ── Acciones ─────────────────────────────────────────────────────────────
  async suspend(item: MarketplaceListing): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Pausar publicación',
      message: 'Nadie podrá reservarla hasta que la reanudes. Las reservas que ya tenga se mantienen.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Pausar', handler: () => this.run(item, this.market.suspend(item.id), 'Publicación pausada.') }
      ]
    });
    await alert.present();
  }

  resume(item: MarketplaceListing): void {
    this.run(item, this.market.resume(item.id), 'Publicación reanudada.');
  }

  async close(item: MarketplaceListing): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar publicación',
      message: 'Se cierra definitivamente y ya no se puede reabrir. Si querés ofrecerla de nuevo, publicala otra vez.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Cerrar', role: 'destructive', handler: () => this.run(item, this.market.close(item.id), 'Publicación cerrada.') }
      ]
    });
    await alert.present();
  }

  private run(item: MarketplaceListing, call: ReturnType<MarketplaceService['suspend']>, okMessage: string): void {
    if (this.busyId) return;
    this.busyId = item.id;
    call.subscribe({
      next: updated => {
        this.busyId = null;
        this.listings = this.listings
          .map(x => (x.id === updated.id ? updated : x))
          .filter(x => x.status !== 'Closed');
        this.toast(okMessage, 'success');
      },
      error: err => {
        this.busyId = null;
        this.toast(apiErrorMessage(err, 'No se pudo completar la acción.'), 'danger');
        this.loadListings();
      }
    });
  }

  goBack(): void { this.navCtrl.back(); }

  private async toast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 3500, color, position: 'bottom' });
    await toast.present();
  }
}
