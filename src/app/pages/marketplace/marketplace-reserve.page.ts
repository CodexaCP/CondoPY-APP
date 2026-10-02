import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ToastController } from '@ionic/angular';
import { finalize } from 'rxjs/operators';
import { MarketplaceService } from '../../core/marketplace.service';
import { MarketplaceExploreItem, MarketplaceQuote } from '../../core/marketplace.models';
import { StartOption, apiErrorMessage, formatCurrency, formatWindow, hoursLabel, startOptions } from './marketplace.util';

// Reservar un espacio: se elige desde cuándo y cuántas horas, se ve el desglose exacto (lo calcula el servidor) y se reserva.
@Component({
  selector: 'app-marketplace-reserve',
  templateUrl: './marketplace-reserve.page.html',
  styleUrls: ['./marketplace-reserve.page.scss'],
  standalone: false
})
export class MarketplaceReservePage {
  loading = true;
  saving = false;
  quoting = false;
  error = '';

  item: MarketplaceExploreItem | null = null;
  options: StartOption[] = [];
  startIso = '';
  hours = 0;
  quote: MarketplaceQuote | null = null;
  quoteError = '';

  readonly formatCurrency = formatCurrency;
  readonly formatWindow = formatWindow;
  readonly hoursLabel = hoursLabel;

  // Para ignorar respuestas viejas si el usuario cambia la elección rápido.
  private quoteSeq = 0;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly market: MarketplaceService,
    private readonly navCtrl: NavController,
    private readonly toastCtrl: ToastController
  ) {}

  ionViewWillEnter(): void {
    this.loading = true;
    this.error = '';
    this.quote = null;
    this.startIso = '';
    this.hours = 0;

    const listingId = this.route.snapshot.paramMap.get('listingId');
    this.market.loadBuildings().subscribe({
      next: () => {
        const building = this.market.selected;
        if (!building || !listingId) {
          this.fail('El Marketplace no está disponible en tu edificio.');
          return;
        }
        this.market.explore(building.buildingId).subscribe({
          next: items => {
            this.item = items.find(x => x.listingId === listingId) ?? null;
            if (!this.item) {
              this.fail('Este espacio ya no está disponible.');
              return;
            }
            this.options = startOptions(this.item, Date.now());
            if (this.options.length === 0) {
              this.fail('Ya no queda horario libre en este espacio.');
              return;
            }
            this.loading = false;
          },
          error: err => this.fail(apiErrorMessage(err, 'No se pudo cargar el espacio.'))
        });
      },
      error: () => this.fail('No se pudo cargar el Marketplace. Probá de nuevo.')
    });
  }

  private fail(message: string): void {
    this.error = message;
    this.loading = false;
  }

  get selectedOption(): StartOption | null {
    return this.options.find(o => o.startIso === this.startIso) ?? null;
  }

  // 1 hora, 2 horas... hasta lo máximo seguido que hay libre desde ese horario.
  get hourChoices(): number[] {
    const max = this.selectedOption?.maxHours ?? 0;
    return Array.from({ length: max }, (_, i) => i + 1);
  }

  onStartChange(): void {
    this.quote = null;
    this.quoteError = '';
    this.hours = this.selectedOption ? 1 : 0;
    this.requestQuote();
  }

  onHoursChange(): void { this.requestQuote(); }

  private requestQuote(): void {
    this.quote = null;
    this.quoteError = '';
    if (!this.item || !this.startIso || !this.hours) return;

    const start = new Date(this.startIso);
    const end = new Date(start.getTime() + this.hours * 3_600_000);
    const seq = ++this.quoteSeq;
    this.quoting = true;
    this.market.quote({ listingId: this.item.listingId, startsAtUtc: start.toISOString(), endsAtUtc: end.toISOString() })
      .pipe(finalize(() => { if (seq === this.quoteSeq) this.quoting = false; }))
      .subscribe({
        next: quote => { if (seq === this.quoteSeq) this.quote = quote; },
        error: err => { if (seq === this.quoteSeq) this.quoteError = apiErrorMessage(err, 'No se pudo calcular el precio.'); }
      });
  }

  reserve(): void {
    if (!this.item || !this.quote || this.saving) return;
    this.saving = true;
    this.market.reserve({
      listingId: this.item.listingId,
      startsAtUtc: this.quote.startsAtUtc,
      endsAtUtc: this.quote.endsAtUtc
    }).pipe(finalize(() => (this.saving = false))).subscribe({
      next: reservation => {
        const minutes = reservation.expiresAtUtc
          ? Math.max(1, Math.round((Date.parse(reservation.expiresAtUtc) - Date.now()) / 60000))
          : 10;
        this.toast(`¡Reserva creada! Tenés ${minutes} minutos para pagar.`, 'success');
        this.navCtrl.navigateRoot('/area/marketplace?tab=reservations');
      },
      error: err => {
        this.toast(apiErrorMessage(err, 'No se pudo reservar.'), 'danger');
        // Si el horario se ocupó mientras elegías, se recarga la disponibilidad.
        this.ionViewWillEnter();
      }
    });
  }

  goBack(): void { this.navCtrl.back(); }

  private async toast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 4000, color, position: 'bottom' });
    await toast.present();
  }
}
