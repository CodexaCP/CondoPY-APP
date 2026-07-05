import { Component, OnInit } from '@angular/core';
import { NavController, AlertController, ToastController } from '@ionic/angular';
import { finalize } from 'rxjs/operators';
import { AmenitiesService } from '../../core/amenities.service';
import { UploadService } from '../../core/upload.service';
import { Amenity, AmenityReservation, AmenityReservationStatus, AmenityScheduleSlot } from '../../core/models';

const STATUS_LABEL: Record<string, string> = {
  PendingPayment: 'Pendiente de pago',
  PendingReview:  'En revisión',
  Confirmed:      'Confirmada',
  Rejected:       'Rechazada',
  Cancelled:      'Cancelada'
};

const STATUS_COLOR: Record<string, string> = {
  PendingPayment: '#f59e0b',
  PendingReview:  '#3b82f6',
  Confirmed:      '#22c55e',
  Rejected:       '#ef4444',
  Cancelled:      '#94a3b8'
};

@Component({
  selector: 'app-amenities',
  templateUrl: './amenities.page.html',
  styleUrls: ['./amenities.page.scss'],
  standalone: false
})
export class AmenitiesPage implements OnInit {
  segment: 'reservar' | 'mias' = 'reservar';
  amenities: Amenity[] = [];
  reservations: AmenityReservation[] = [];
  loading = true;
  error = '';

  // Formulario de reserva
  selectedAmenity: Amenity | null = null;
  reserveDate = '';
  startTime = '';
  endTime = '';
  notes = '';
  daySlots: AmenityScheduleSlot[] = [];
  saving = false;

  uploadingId: string | null = null;

  constructor(
    private readonly amenitiesService: AmenitiesService,
    private readonly uploadService: UploadService,
    private readonly navCtrl: NavController,
    private readonly alertCtrl: AlertController,
    private readonly toastCtrl: ToastController
  ) {}

  ngOnInit(): void { this.loadData(); }

  ionViewWillEnter(): void { this.loadReservations(); }

  loadData(event?: CustomEvent): void {
    this.loading = true;
    this.error = '';
    this.amenitiesService.getMine().subscribe({
      next: items => {
        this.amenities = items;
        this.loading = false;
        this.loadReservations();
        (event as any)?.detail?.complete?.();
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudieron cargar los amenities.';
        (event as any)?.detail?.complete?.();
      }
    });
  }

  loadReservations(): void {
    this.amenitiesService.getMyReservations().subscribe({
      next: items => this.reservations = items,
      error: () => {}
    });
  }

  openReserve(amenity: Amenity): void {
    this.selectedAmenity = amenity;
    const today = new Date();
    this.reserveDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    this.startTime = '';
    this.endTime = '';
    this.notes = '';
    this.loadDaySlots();
  }

  closeReserve(): void { this.selectedAmenity = null; this.daySlots = []; }

  loadDaySlots(): void {
    if (!this.selectedAmenity || !this.reserveDate) { this.daySlots = []; return; }
    const dayStart = new Date(`${this.reserveDate}T00:00:00`);
    const dayEnd = new Date(`${this.reserveDate}T23:59:59`);
    this.amenitiesService.getSchedule(this.selectedAmenity.id, dayStart.toISOString(), dayEnd.toISOString()).subscribe({
      next: slots => this.daySlots = slots,
      error: () => this.daySlots = []
    });
  }

  async submitReserve(): Promise<void> {
    if (!this.selectedAmenity) return;
    if (!this.reserveDate || !this.startTime || !this.endTime) {
      this.showToast('Completá fecha, hora de inicio y de fin.', 'warning'); return;
    }

    const startsAt = new Date(`${this.reserveDate}T${this.startTime}`);
    const endsAt = new Date(`${this.reserveDate}T${this.endTime}`);
    if (endsAt <= startsAt) { this.showToast('La hora de fin debe ser posterior a la de inicio.', 'warning'); return; }
    if (endsAt <= new Date()) { this.showToast('No se puede reservar en el pasado.', 'warning'); return; }

    this.saving = true;
    this.amenitiesService.reserve(this.selectedAmenity.id, startsAt.toISOString(), endsAt.toISOString(), this.notes.trim())
      .pipe(finalize(() => this.saving = false))
      .subscribe({
        next: async reservation => {
          this.reservations = [reservation, ...this.reservations];
          this.closeReserve();
          this.segment = 'mias';
          const alert = await this.alertCtrl.create({
            header: 'Reserva creada',
            message: `Tu reserva quedó registrada por ${this.formatCurrency(reservation.price)}. Subí el comprobante de pago desde "Mis reservas" para que la administración la confirme.`,
            buttons: ['Entendido']
          });
          await alert.present();
        },
        error: err => {
          const body = err?.error;
          const msg = typeof body === 'string' ? body : (body?.message ?? body?.title ?? body?.detail);
          this.showToast(msg ?? 'No se pudo crear la reserva.', 'danger');
          this.loadDaySlots();
        }
      });
  }

  onComprobanteSelected(event: Event, reservation: AmenityReservation): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.uploadingId = reservation.id;
    this.uploadService.uploadImage(file).subscribe({
      next: url => {
        this.amenitiesService.attachComprobante(reservation.id, url)
          .pipe(finalize(() => this.uploadingId = null))
          .subscribe({
            next: updated => {
              this.reservations = this.reservations.map(x => x.id === updated.id ? updated : x);
              this.showToast('Comprobante enviado. La administración revisará tu reserva.', 'success');
            },
            error: () => this.showToast('No se pudo adjuntar el comprobante.', 'danger')
          });
      },
      error: () => {
        this.uploadingId = null;
        this.showToast('No se pudo subir la imagen.', 'danger');
      }
    });
  }

  async cancelReservation(reservation: AmenityReservation): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Cancelar reserva',
      message: `¿Cancelar la reserva de ${reservation.amenityName}?`,
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Sí, cancelar',
          handler: () => {
            this.amenitiesService.cancel(reservation.id).subscribe({
              next: updated => {
                this.reservations = this.reservations.map(x => x.id === updated.id ? updated : x);
                this.showToast('Reserva cancelada.', 'success');
              },
              error: () => this.showToast('No se pudo cancelar.', 'danger')
            });
          }
        }
      ]
    });
    await alert.present();
  }

  canAct(r: AmenityReservation): boolean {
    return r.status === 'PendingPayment' || r.status === 'PendingReview';
  }

  statusLabel(status: AmenityReservationStatus): string { return STATUS_LABEL[status] ?? status; }
  statusColor(status: AmenityReservationStatus): string { return STATUS_COLOR[status] ?? '#64748b'; }

  formatCurrency(value: number): string { return `Gs. ${Math.round(value).toLocaleString('es-PY')}`; }

  formatRange(startsAt: string, endsAt: string): string {
    const s = new Date(startsAt);
    const e = new Date(endsAt);
    const date = s.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const st = s.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
    const et = e.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
    return `${date} · ${st} a ${et} hs`;
  }

  formatSlot(slot: AmenityScheduleSlot): string {
    const s = new Date(slot.startsAt);
    const e = new Date(slot.endsAt);
    const st = s.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
    const et = e.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });
    return `${st} a ${et} hs`;
  }

  goBack(): void { this.navCtrl.back(); }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 3500, color, position: 'bottom' });
    await toast.present();
  }
}
