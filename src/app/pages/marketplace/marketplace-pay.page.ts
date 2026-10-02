import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ToastController } from '@ionic/angular';
import { MarketplaceService } from '../../core/marketplace.service';
import { MarketplacePaymentInfo } from '../../core/marketplace.models';
import { UploadService } from '../../core/upload.service';
import { apiErrorMessage, countdown, formatCurrency } from './marketplace.util';

// Pago de una reserva en una sola pantalla: cuenta regresiva, cuánto y adónde transferir, y adjuntar el comprobante.
@Component({
  selector: 'app-marketplace-pay',
  templateUrl: './marketplace-pay.page.html',
  styleUrls: ['./marketplace-pay.page.scss'],
  standalone: false
})
export class MarketplacePayPage {
  loading = true;
  error = '';
  info: MarketplacePaymentInfo | null = null;

  file: File | null = null;
  previewUrl = '';
  sending = false;

  nowMs = Date.now();
  private timer: ReturnType<typeof setInterval> | null = null;
  private reservationId = '';

  readonly formatCurrency = formatCurrency;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly market: MarketplaceService,
    private readonly uploads: UploadService,
    private readonly navCtrl: NavController,
    private readonly toastCtrl: ToastController
  ) {}

  ionViewWillEnter(): void {
    this.reservationId = this.route.snapshot.paramMap.get('id') ?? '';
    this.nowMs = Date.now();
    this.timer = setInterval(() => (this.nowMs = Date.now()), 1000);
    this.load();
  }

  ionViewWillLeave(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.clearFile();
  }

  private load(): void {
    this.loading = true;
    this.error = '';
    this.market.paymentInfo(this.reservationId).subscribe({
      next: info => { this.info = info; this.loading = false; },
      error: err => {
        this.loading = false;
        this.error = apiErrorMessage(err, 'No se pudo cargar el pago de esta reserva.');
      }
    });
  }

  get remaining() { return countdown(this.info?.expiresAtUtc ?? null, this.nowMs); }
  get expired(): boolean { return this.remaining.expired; }
  get canSend(): boolean { return !!this.file && !this.sending && !this.expired; }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    this.clearFile();
    if (!file) return;
    this.file = file;
    this.previewUrl = URL.createObjectURL(file);
  }

  clearFile(): void {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = '';
    this.file = null;
  }

  // Sube la imagen y luego envía el comprobante a la reserva. Si algo falla, se puede reintentar sin perder la reserva.
  send(): void {
    if (!this.canSend || !this.file) return;
    this.sending = true;

    this.uploads.uploadImage(this.file).subscribe({
      next: url => {
        this.market.submitPayment(this.reservationId, url).subscribe({
          next: () => {
            this.sending = false;
            this.toast('Comprobante enviado. La administración lo va a revisar.', 'success');
            this.navCtrl.navigateRoot('/area/marketplace?tab=reservations');
          },
          error: err => {
            this.sending = false;
            this.toast(apiErrorMessage(err, 'No se pudo enviar el comprobante.'), 'danger');
            this.load();
          }
        });
      },
      error: () => {
        this.sending = false;
        this.toast('No se pudo subir la imagen. Probá de nuevo.', 'danger');
      }
    });
  }

  goBack(): void { this.navCtrl.back(); }

  private async toast(message: string, color: 'success' | 'warning' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({ message, duration: 4000, color, position: 'bottom' });
    await toast.present();
  }
}
