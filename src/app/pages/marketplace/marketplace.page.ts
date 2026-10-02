import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionSheetController, AlertController, NavController, ToastController } from '@ionic/angular';
import { MarketplaceService } from '../../core/marketplace.service';
import {
  MarketplaceBuilding,
  MarketplaceExploreItem,
  MarketplaceInterval,
  MarketplaceListing,
  MarketplaceReservation
} from '../../core/marketplace.models';
import {
  Tone,
  apiErrorMessage,
  countdown,
  formatCurrency,
  formatTime,
  formatWindow,
  hoursLabel,
  reservationStatusLabel,
  reservationTone
} from './marketplace.util';

type Segment = 'explore' | 'reservations' | 'mine';

@Component({
  selector: 'app-marketplace',
  templateUrl: './marketplace.page.html',
  styleUrls: ['./marketplace.page.scss'],
  standalone: false
})
export class MarketplacePage {
  segment: Segment = 'explore';
  loading = true;
  error = '';
  buildings: MarketplaceBuilding[] = [];
  selected: MarketplaceBuilding | null = null;

  explore: MarketplaceExploreItem[] = [];
  reservations: MarketplaceReservation[] = [];
  listings: MarketplaceListing[] = [];
  busyId: string | null = null;

  // Reloj de la pantalla: mueve la cuenta regresiva de las reservas esperando pago.
  nowMs = Date.now();
  private timer: ReturnType<typeof setInterval> | null = null;
  private reloadedForExpiry = false;

  readonly formatCurrency = formatCurrency;
  readonly formatWindow = formatWindow;
  readonly hoursLabel = hoursLabel;

  constructor(
    private readonly market: MarketplaceService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly navCtrl: NavController,
    private readonly alertCtrl: AlertController,
    private readonly actionSheetCtrl: ActionSheetController,
    private readonly toastCtrl: ToastController
  ) {}

  ionViewWillEnter(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'reservations' || tab === 'mine' || tab === 'explore') this.segment = tab;

    this.nowMs = Date.now();
    this.timer = setInterval(() => this.tick(), 1000);
    this.load();
  }

  ionViewWillLeave(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private tick(): void {
    this.nowMs = Date.now();
    // Cuando una reserva esperando pago llega a cero, se vuelve a pedir la lista una sola vez: el servidor ya la marca vencida.
    const justExpired = this.reservations.some(r => r.status === 'PendingPayment' && this.remaining(r).expired);
    if (justExpired && !this.reloadedForExpiry) {
      this.reloadedForExpiry = true;
      setTimeout(() => this.loadSegment(), 1500);
    }
    if (!justExpired) this.reloadedForExpiry = false;
  }

  load(event?: CustomEvent): void {
    this.error = '';
    this.market.loadBuildings(true).subscribe({
      next: buildings => {
        this.buildings = buildings;
        this.selected = this.market.selected;
        if (!this.selected) {
          this.loading = false;
          (event as any)?.detail?.complete?.();
          return;
        }
        // Si no puede publicar, la pestaña "Mis publicaciones" no existe.
        if (this.segment === 'mine' && !this.selected.canPublish) this.segment = 'explore';
        this.loadSegment(event);
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudo cargar el Marketplace. Probá de nuevo.';
        (event as any)?.detail?.complete?.();
      }
    });
  }

  onSegmentChange(): void { this.loadSegment(); }

  loadSegment(event?: CustomEvent): void {
    if (!this.selected) return;
    const buildingId = this.selected.buildingId;
    this.error = '';
    const done = () => { this.loading = false; (event as any)?.detail?.complete?.(); };
    const fail = (err: any, fallback: string) => { this.error = apiErrorMessage(err, fallback); done(); };

    if (this.segment === 'explore') {
      this.market.explore(buildingId).subscribe({
        next: items => { this.explore = items; done(); },
        error: err => fail(err, 'No se pudieron cargar los espacios.')
      });
    } else if (this.segment === 'reservations') {
      this.market.getMyReservations(buildingId).subscribe({
        next: items => { this.reservations = items; done(); },
        error: err => fail(err, 'No se pudieron cargar tus reservas.')
      });
    } else {
      this.market.getMine(buildingId).subscribe({
        next: items => { this.listings = items.filter(x => x.status !== 'Closed'); done(); },
        error: err => fail(err, 'No se pudieron cargar tus publicaciones.')
      });
    }
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
            if (this.segment === 'mine' && !b.canPublish) this.segment = 'explore';
            this.loading = true;
            this.loadSegment();
          }
        })),
        { text: 'Cancelar', role: 'cancel' }
      ]
    });
    await sheet.present();
  }

  // ── Explorar ─────────────────────────────────────────────────────────────
  reserve(item: MarketplaceExploreItem): void {
    this.router.navigate(['/area/marketplace/reserve', item.listingId]);
  }

  occupiedText(intervals: MarketplaceInterval[]): string {
    return intervals.map(i => `${formatTime(i.startUtc)} a ${formatTime(i.endUtc)}`).join(' · ');
  }

  pay(r: MarketplaceReservation): void {
    this.router.navigate(['/area/marketplace/pay', r.id]);
  }

  // ── Mis reservas ─────────────────────────────────────────────────────────
  statusLabel(r: MarketplaceReservation): string { return reservationStatusLabel(r.status); }
  statusTone(r: MarketplaceReservation): Tone { return reservationTone(r.status); }
  remaining(r: MarketplaceReservation) { return countdown(r.expiresAtUtc, this.nowMs); }

  async cancelReservation(r: MarketplaceReservation): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cancelar reserva',
      message: `¿Cancelar tu reserva de ${r.title}? El horario queda libre para otros vecinos.`,
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Sí, cancelar',
          role: 'destructive',
          handler: () => {
            if (this.busyId) return;
            this.busyId = r.id;
            this.market.cancelReservation(r.id).subscribe({
              next: updated => {
                this.busyId = null;
                this.reservations = this.reservations.map(x => (x.id === updated.id ? updated : x));
                this.toast('Reserva cancelada.', 'success');
              },
              error: err => {
                this.busyId = null;
                this.toast(apiErrorMessage(err, 'No se pudo cancelar la reserva.'), 'danger');
                this.loadSegment();
              }
            });
          }
        }
      ]
    });
    await alert.present();
  }

  // ── Mis publicaciones ────────────────────────────────────────────────────
  publish(): void { this.router.navigateByUrl('/area/marketplace/new'); }
  edit(item: MarketplaceListing): void { this.router.navigateByUrl(`/area/marketplace/${item.id}/edit`); }

  listingLabel(item: MarketplaceListing): string {
    if (item.windowEnded) return 'Finalizada';
    return item.status === 'Suspended' ? 'Pausada' : 'Activa';
  }

  listingTone(item: MarketplaceListing): Tone {
    if (item.windowEnded) return 'grey';
    return item.status === 'Suspended' ? 'amber' : 'green';
  }

  canEdit(item: MarketplaceListing): boolean { return !item.windowEnded; }

  async suspend(item: MarketplaceListing): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Pausar publicación',
      message: 'Nadie podrá reservarla hasta que la reanudes. Las reservas que ya tenga se mantienen.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Pausar', handler: () => this.runListing(item, this.market.suspend(item.id), 'Publicación pausada.') }
      ]
    });
    await alert.present();
  }

  resume(item: MarketplaceListing): void {
    this.runListing(item, this.market.resume(item.id), 'Publicación reanudada.');
  }

  async close(item: MarketplaceListing): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar publicación',
      message: 'Se cierra definitivamente y ya no se puede reabrir. Si querés ofrecerla de nuevo, publicala otra vez.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Cerrar', role: 'destructive', handler: () => this.runListing(item, this.market.close(item.id), 'Publicación cerrada.') }
      ]
    });
    await alert.present();
  }

  private runListing(item: MarketplaceListing, call: ReturnType<MarketplaceService['suspend']>, okMessage: string): void {
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
        this.loadSegment();
      }
    });
  }

  goBack(): void { this.navCtrl.back(); }

  private async toast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 3500, color, position: 'bottom' });
    await toast.present();
  }
}
