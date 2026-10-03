import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ActionSheetController, AlertController, NavController, ToastController } from '@ionic/angular';
import { MarketplaceService } from '../../core/marketplace.service';
import {
  MarketplaceBuilding,
  MarketplaceExploreItem,
  MarketplaceInterval,
  MarketplaceListing,
  MarketplaceOwnerReservation,
  MarketplaceReservation
} from '../../core/marketplace.models';
import {
  Tone,
  apiErrorMessage,
  countdown,
  formatCurrency,
  formatDateTime,
  formatTime,
  formatWindow,
  hoursLabel,
  reservationStatusLabel,
  reservationTone
} from './marketplace.util';

type Segment = 'explore' | 'reservations' | 'mine' | 'received';

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
  received: MarketplaceOwnerReservation[] = [];
  busyId: string | null = null;

  // Reloj de la pantalla: mueve la cuenta regresiva de las reservas esperando pago.
  nowMs = Date.now();
  private timer: ReturnType<typeof setInterval> | null = null;
  private reloadedForExpiry = false;
  private focusId: string | null = null;

  readonly formatCurrency = formatCurrency;
  readonly formatDateTime = formatDateTime;
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
    if (tab === 'reservations' || tab === 'mine' || tab === 'explore' || tab === 'received') this.segment = tab;
    // Un aviso trae el id de la reserva: se abre en la lista donde está (mis reservas o las recibidas en mis espacios).
    this.focusId = this.route.snapshot.queryParamMap.get('focus');

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
        if ((this.segment === 'mine' || this.segment === 'received') && !this.selected.canPublish) this.segment = 'explore';
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

    if (this.focusId) {
      const id = this.focusId;
      this.focusId = null;
      this.resolveFocus(id, buildingId, event);
      return;
    }

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
    } else if (this.segment === 'received') {
      this.market.getOnMyListings(buildingId).subscribe({
        next: items => { this.received = items; done(); },
        error: err => fail(err, 'No se pudieron cargar las reservas de tus espacios.')
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
            if ((this.segment === 'mine' || this.segment === 'received') && !b.canPublish) this.segment = 'explore';
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

  // Cancelar una reserva ya pagada (antes del inicio): se avisa ANTES lo que se devuelve y que la comisión no se devuelve.
  async cancelPaid(r: MarketplaceReservation): Promise<void> {
    if (this.busyId) return;
    this.busyId = r.id;
    this.market.cancelPreview(r.id).subscribe({
      next: async preview => {
        this.busyId = null;
        if (!preview.canCancel) {
          this.toast(preview.blockedReason ?? 'Esta reserva ya no se puede cancelar.', 'warning');
          this.loadSegment();
          return;
        }

        const alert = await this.alertCtrl.create({
          header: 'Cancelar reserva',
          message: `Se te devolverán ${formatCurrency(preview.refundAmount)} (el precio del espacio). ` +
                   `Se cobrará la comisión por la gestión de la reserva (${formatCurrency(preview.commissionAmount)}) y no se devuelve. ` +
                   'El horario queda libre.',
          inputs: [{ name: 'reason', type: 'textarea', placeholder: 'Motivo (opcional)', attributes: { maxlength: 500 } }],
          buttons: [
            { text: 'No', role: 'cancel' },
            {
              text: 'Sí, cancelar',
              role: 'destructive',
              handler: (data: { reason?: string }) => {
                this.runCancel(r, this.market.cancelReservation(r.id, (data.reason ?? '').trim() || undefined), 'Reserva cancelada. Tu reembolso quedó registrado.');
                return true;
              }
            }
          ]
        });
        await alert.present();
      },
      error: err => {
        this.busyId = null;
        this.toast(apiErrorMessage(err, 'No se pudo preparar la cancelación.'), 'danger');
      }
    });
  }

  // El propietario cancela una reserva pagada de su espacio: motivo obligatorio; se devuelve todo al comprador y él asume la comisión.
  async ownerCancel(r: MarketplaceOwnerReservation): Promise<void> {
    if (this.busyId) return;
    this.busyId = r.id;
    this.market.cancelPreview(r.id).subscribe({
      next: async preview => {
        this.busyId = null;
        if (!preview.canCancel) {
          this.toast(preview.blockedReason ?? 'Esta reserva ya no se puede cancelar.', 'warning');
          this.loadSegment();
          return;
        }

        const alert = await this.alertCtrl.create({
          header: 'Cancelar reserva',
          message: `Se le devuelve todo al comprador (${formatCurrency(preview.refundAmount)}) y vos asumís la comisión por la gestión ` +
                   `(${formatCurrency(preview.commissionAmount)}): se te descuenta de tu saldo a favor y, si no alcanza, queda como ` +
                   'deuda que se descuenta de tu próxima acreditación del Marketplace. No cobrás esta reserva.',
          inputs: [{ name: 'reason', type: 'textarea', placeholder: 'Motivo (obligatorio)', attributes: { maxlength: 500 } }],
          buttons: [
            { text: 'No', role: 'cancel' },
            {
              text: 'Sí, cancelar',
              role: 'destructive',
              handler: (data: { reason?: string }) => {
                const reason = (data.reason ?? '').trim();
                if (!reason) {
                  this.toast('Escribí el motivo de la cancelación.', 'warning');
                  return false;
                }
                this.busyId = r.id;
                this.market.ownerCancel(r.id, reason).subscribe({
                  next: updated => {
                    this.busyId = null;
                    this.received = this.received.map(x => (x.id === updated.id ? updated : x));
                    this.toast('Reserva cancelada.', 'success');
                  },
                  error: err => {
                    this.busyId = null;
                    this.toast(apiErrorMessage(err, 'No se pudo cancelar la reserva.'), 'danger');
                    this.loadSegment();
                  }
                });
                return true;
              }
            }
          ]
        });
        await alert.present();
      },
      error: err => {
        this.busyId = null;
        this.toast(apiErrorMessage(err, 'No se pudo preparar la cancelación.'), 'danger');
      }
    });
  }

  private runCancel(r: MarketplaceReservation, call: ReturnType<MarketplaceService['cancelReservation']>, okMessage: string): void {
    this.busyId = r.id;
    call.subscribe({
      next: updated => {
        this.busyId = null;
        this.reservations = this.reservations.map(x => (x.id === updated.id ? updated : x));
        this.toast(okMessage, 'success');
      },
      error: err => {
        this.busyId = null;
        this.toast(apiErrorMessage(err, 'No se pudo cancelar la reserva.'), 'danger');
        this.loadSegment();
      }
    });
  }

  // "Reportar un problema": comprador o propietario, desde que empieza la reserva hasta 24 horas después de su fin.
  async reportProblem(reservationId: string, title: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Reportar un problema',
      message: `Contanos qué pasó con la reserva de ${title}. La administración lo revisa y, mientras tanto, la acreditación del saldo queda retenida.`,
      inputs: [{ name: 'reason', type: 'textarea', placeholder: 'Qué pasó (obligatorio)', attributes: { maxlength: 500 } }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Enviar',
          handler: (data: { reason?: string }) => {
            const reason = (data.reason ?? '').trim();
            if (!reason) {
              this.toast('Contanos cuál fue el problema.', 'warning');
              return false;
            }
            this.busyId = reservationId;
            this.market.openClaim(reservationId, reason).subscribe({
              next: () => {
                this.busyId = null;
                this.toast('Enviamos tu reclamo a la administración.', 'success');
                this.loadSegment();
              },
              error: err => {
                this.busyId = null;
                this.toast(apiErrorMessage(err, 'No se pudo enviar el reclamo.'), 'danger');
                this.loadSegment();
              }
            });
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  // Aviso de inicio: "Sí, voy" / "No la voy a usar" (con motivo). Solo queda registrado: no devuelve dinero.
  async respondStart(r: MarketplaceReservation, attending: boolean): Promise<void> {
    if (attending) {
      this.sendStartResponse(r, true);
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'No la voy a usar',
      message: 'Esto solo queda registrado: no se devuelve dinero. Si querés tu dinero, usá «Reportar un problema».',
      inputs: [{ name: 'reason', type: 'textarea', placeholder: 'Motivo (obligatorio)', attributes: { maxlength: 500 } }],
      buttons: [
        { text: 'Volver', role: 'cancel' },
        {
          text: 'Enviar',
          handler: (data: { reason?: string }) => {
            const reason = (data.reason ?? '').trim();
            if (!reason) {
              this.toast('Contanos por qué no la vas a usar.', 'warning');
              return false;
            }
            this.sendStartResponse(r, false, reason);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  private sendStartResponse(r: MarketplaceReservation, attending: boolean, reason?: string): void {
    this.busyId = r.id;
    this.market.respondStart(r.id, attending, reason).subscribe({
      next: updated => {
        this.busyId = null;
        this.reservations = this.reservations.map(x => (x.id === updated.id ? updated : x));
        this.toast('Gracias por avisar.', 'success');
      },
      error: err => {
        this.busyId = null;
        this.toast(apiErrorMessage(err, 'No se pudo registrar tu respuesta.'), 'danger');
        this.loadSegment();
      }
    });
  }

  // ── Recibidas (reservas en mis publicaciones) ────────────────────────────
  receivedLabel(r: MarketplaceOwnerReservation): string { return reservationStatusLabel(r.status); }
  receivedTone(r: MarketplaceOwnerReservation): Tone { return reservationTone(r.status); }

  // Un aviso trae el id de la reserva: se muestra en la lista donde esté (la del comprador o la de mis espacios).
  private resolveFocus(reservationId: string, buildingId: string, event?: CustomEvent): void {
    const done = () => { this.loading = false; (event as any)?.detail?.complete?.(); };
    this.market.getMyReservations(buildingId).subscribe({
      next: mine => {
        if (mine.some(x => x.id === reservationId)) {
          this.reservations = mine;
          this.segment = 'reservations';
          done();
          return;
        }

        if (!this.selected?.canPublish) {
          this.loadSegment(event);
          return;
        }

        this.market.getOnMyListings(buildingId).subscribe({
          next: received => {
            if (received.some(x => x.id === reservationId)) {
              this.received = received;
              this.segment = 'received';
              done();
            } else {
              this.loadSegment(event);
            }
          },
          error: () => this.loadSegment(event)
        });
      },
      error: () => this.loadSegment(event)
    });
  }

  // Una publicación con reservas no se cierra hasta que terminen o se cancelen: este atajo lleva a ellas.
  showReceived(): void {
    this.segment = 'received';
    this.loading = true;
    this.loadSegment();
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
