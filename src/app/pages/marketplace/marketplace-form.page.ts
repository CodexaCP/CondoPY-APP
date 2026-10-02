import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ToastController } from '@ionic/angular';
import { finalize } from 'rxjs/operators';
import { MarketplaceService } from '../../core/marketplace.service';
import { MarketplaceBuilding, MarketplaceListing, MarketplacePublishableUnit } from '../../core/marketplace.models';
import { apiErrorMessage, formatCurrency, halfHourOptions, hoursLabel, localDate, localTime } from './marketplace.util';

// Publicar (o editar) un espacio en tres pasos: qué, cuándo y cuánto por hora. Toda regla se valida de nuevo en el
// servidor; acá solo se avisa antes para que el propietario no tenga que adivinar.
@Component({
  selector: 'app-marketplace-form',
  templateUrl: './marketplace-form.page.html',
  styleUrls: ['./marketplace-form.page.scss'],
  standalone: false
})
export class MarketplaceFormPage {
  editingId: string | null = null;
  loading = true;
  saving = false;
  error = '';

  building: MarketplaceBuilding | null = null;
  units: MarketplacePublishableUnit[] = [];
  unitId = '';
  unitLabel = '';

  title = '';
  startDate = '';
  startTime = '';
  endDate = '';
  endTime = '';
  price: number | null = null;

  readonly times = halfHourOptions();
  readonly today = localDate(new Date().toISOString());
  readonly formatCurrency = formatCurrency;

  // En edición se recuerda el horario original: si no se toca, no hace falta que sea futuro (puede haber empezado ya).
  private original: MarketplaceListing | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly market: MarketplaceService,
    private readonly navCtrl: NavController,
    private readonly toastCtrl: ToastController
  ) {}

  get isEditing(): boolean { return !!this.editingId; }

  ionViewWillEnter(): void {
    this.editingId = this.route.snapshot.paramMap.get('id');
    this.loading = true;
    this.error = '';

    this.market.loadBuildings().subscribe({
      next: () => {
        this.building = this.market.selected;
        if (!this.building) {
          this.fail('El Marketplace no está disponible en tu edificio.');
        } else if (!this.building.canPublish) {
          this.fail('Solo el propietario principal de una unidad puede publicarla.');
        } else if (this.editingId) {
          this.loadForEdit(this.building);
        } else {
          this.loadForCreate(this.building);
        }
      },
      error: () => this.fail('No se pudo cargar el Marketplace. Probá de nuevo.')
    });
  }

  private loadForCreate(building: MarketplaceBuilding): void {
    this.market.getUnits(building.buildingId).subscribe({
      next: units => {
        this.units = units;
        if (units.length === 0) {
          this.fail('No tenés unidades para publicar en este edificio.');
          return;
        }
        this.unitId = units.length === 1 ? units[0].unitId : '';
        this.loading = false;
      },
      error: err => this.fail(apiErrorMessage(err, 'No se pudieron cargar tus unidades.'))
    });
  }

  private loadForEdit(building: MarketplaceBuilding): void {
    this.market.getMine(building.buildingId).subscribe({
      next: items => {
        const item = items.find(x => x.id === this.editingId);
        if (!item) {
          this.fail('No se encontró la publicación.');
          return;
        }
        this.original = item;
        this.unitLabel = `Unidad ${item.unitCode}`;
        this.title = item.title;
        this.startDate = localDate(item.windowStartUtc);
        this.startTime = localTime(item.windowStartUtc);
        this.endDate = localDate(item.windowEndUtc);
        this.endTime = localTime(item.windowEndUtc);
        this.price = item.hourlyPrice;
        this.loading = false;
      },
      error: err => this.fail(apiErrorMessage(err, 'No se pudo cargar la publicación.'))
    });
  }

  private fail(message: string): void {
    this.error = message;
    this.loading = false;
  }

  // Al elegir el "desde", el "hasta" arranca el mismo día para no tener que tocarlo en la mayoría de los casos.
  onStartDateChange(): void {
    if (!this.endDate || this.endDate < this.startDate) this.endDate = this.startDate;
  }

  // ── Validación en vivo ───────────────────────────────────────────────────

  private toDate(date: string, time: string): Date | null {
    if (!date || !time) return null;
    const d = new Date(`${date}T${time}:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  get start(): Date | null { return this.toDate(this.startDate, this.startTime); }
  get end(): Date | null { return this.toDate(this.endDate, this.endTime); }

  get hours(): number | null {
    const s = this.start;
    const e = this.end;
    if (!s || !e || e <= s || s.getMinutes() !== e.getMinutes()) return null;
    return Math.round((e.getTime() - s.getTime()) / 3_600_000);
  }

  get durationLabel(): string { return this.hours ? hoursLabel(this.hours) : ''; }

  // Primer problema que impide guardar, en palabras simples; null si está todo bien.
  get problem(): string | null {
    if (!this.isEditing && !this.unitId) return 'Elegí la unidad.';
    if (!this.title.trim()) return 'Poné un título, por ejemplo «Cochera 12».';

    const s = this.start;
    const e = this.end;
    if (!s || !e) return 'Elegí desde cuándo y hasta cuándo.';
    if (e <= s) return 'El «hasta» tiene que ser después del «desde».';
    if (s.getMinutes() !== e.getMinutes()) {
      return 'Desde y hasta tienen que ser los dos en punto o los dos y media, para que sean horas enteras.';
    }

    const windowChanged = !this.original
      || s.toISOString() !== new Date(this.original.windowStartUtc).toISOString()
      || e.toISOString() !== new Date(this.original.windowEndUtc).toISOString();
    if (windowChanged && s <= new Date()) return 'El horario tiene que empezar más adelante.';

    if (this.price === null || !Number.isFinite(this.price) || this.price <= 0 || !Number.isInteger(this.price)) {
      return 'Poné cuánto querés recibir por hora, en guaraníes y sin decimales.';
    }
    return null;
  }

  // ── Guardar ──────────────────────────────────────────────────────────────

  save(): void {
    const problem = this.problem;
    if (problem || this.saving || !this.building) return;

    const request = {
      title: this.title.trim(),
      windowStartUtc: this.start!.toISOString(),
      windowEndUtc: this.end!.toISOString(),
      hourlyPrice: this.price!
    };

    this.saving = true;
    const call = this.editingId
      ? this.market.update(this.editingId, request)
      : this.market.create({ ...request, buildingId: this.building.buildingId, unitId: this.unitId });

    call.pipe(finalize(() => (this.saving = false))).subscribe({
      next: () => {
        this.toast(this.editingId ? 'Publicación actualizada.' : '¡Listo! Tu espacio ya está publicado.', 'success');
        this.navCtrl.navigateBack('/area/marketplace');
      },
      error: err => this.toast(apiErrorMessage(err, 'No se pudo guardar la publicación.'), 'danger')
    });
  }

  goBack(): void { this.navCtrl.back(); }

  private async toast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 3500, color, position: 'bottom' });
    await toast.present();
  }
}
