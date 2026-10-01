import { Component, OnDestroy, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { distinctUntilChanged, map, skip } from 'rxjs/operators';
import { BuildingContextService } from '../../../core/building-context.service';
import { ManagerApiService } from '../../../core/manager-api.service';
import { ManagerStateService } from '../../../core/manager-state.service';
import { Claim, ClaimStatus } from '../../../core/models';
import { PlanGateService } from '../../../core/plan-gate.service';
import { errorMessage, fmtDateTime } from '../manager.util';

// Estados a los que se puede pasar desde cada uno.
const TRANSITIONS: Record<ClaimStatus, { to: ClaimStatus; label: string; icon: string; primary?: boolean }[]> = {
  Pendiente: [
    { to: 'EnProceso', label: 'Pasar a En proceso', icon: 'play-outline', primary: true },
    { to: 'Resuelto', label: 'Marcar como resuelto', icon: 'checkmark-done-outline' }
  ],
  EnProceso: [
    { to: 'Resuelto', label: 'Marcar como resuelto', icon: 'checkmark-done-outline', primary: true },
    { to: 'Pendiente', label: 'Volver a Pendiente', icon: 'arrow-undo-outline' }
  ],
  Resuelto: [
    { to: 'Pendiente', label: 'Reabrir (Pendiente)', icon: 'refresh-outline' }
  ]
};

@Component({
  selector: 'app-manager-claims',
  templateUrl: './manager-claims.page.html',
  styleUrls: ['../manager.shared.scss', './manager-claims.page.scss'],
  standalone: false,
})
export class ManagerClaimsPage implements OnInit, OnDestroy {
  segment: ClaimStatus = 'Pendiente';
  claims: Claim[] = [];
  loading = true;
  error = '';
  selected: Claim | null = null;
  acting = false;

  readonly dateTime = fmtDateTime;

  private sub = new Subscription();
  private seq = 0;

  constructor(
    private api: ManagerApiService,
    private buildings: BuildingContextService,
    private state: ManagerStateService,
    private gate: PlanGateService,
    private alerts: AlertController,
    private toasts: ToastController
  ) {}

  get readOnly(): boolean { return this.gate.readOnly; }
  get transitions() { return this.selected ? TRANSITIONS[this.selected.status] : []; }

  ngOnInit(): void {
    this.sub.add(
      this.buildings.selected$.pipe(skip(1), map(b => b?.id ?? null), distinctUntilChanged())
        .subscribe(id => { if (id) this.load(); })
    );
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }

  ionViewWillEnter(): void {
    if (this.buildings.selectedId) this.load(true);
  }

  // ion-segment avisa también al armarse con el valor inicial: solo se recarga si el segmento cambió de verdad.
  private lastSegment: ClaimStatus = this.segment;

  onSegmentChange(): void {
    if (this.segment === this.lastSegment) return;
    this.lastSegment = this.segment;
    this.load();
  }

  retry(): void { this.load(); }

  refresh(event: CustomEvent): void {
    this.state.refresh().subscribe();
    this.load(true, event);
  }

  statusLabel(status: string): string { return status === 'EnProceso' ? 'En proceso' : status; }

  statusClass(status: string): string {
    switch (status) {
      case 'Pendiente': return 'warn';
      case 'EnProceso': return 'info';
      case 'Resuelto': return 'ok';
      default: return 'muted';
    }
  }

  open(claim: Claim): void { this.selected = claim; }
  close(): void { this.selected = null; }

  async change(to: ClaimStatus): Promise<void> {
    const claim = this.selected;
    if (!claim) return;

    const alert = await this.alerts.create({
      header: 'Cambiar estado',
      message: `El reclamo pasa a "${this.statusLabel(to)}" y se avisa a quien lo creó.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Confirmar', handler: () => this.doChange(claim, to) }
      ]
    });
    await alert.present();
  }

  private doChange(claim: Claim, to: ClaimStatus): void {
    this.acting = true;
    this.api.updateClaimStatus(claim.id, to).subscribe({
      next: () => {
        this.acting = false;
        this.selected = null;
        void this.toast('Estado actualizado');
        this.state.refresh().subscribe();
        this.load(true);
      },
      error: async err => {
        this.acting = false;
        const alert = await this.alerts.create({
          header: 'No se pudo cambiar',
          message: errorMessage(err, 'Ocurrió un error. Intentá de nuevo.'),
          buttons: ['Entendido']
        });
        await alert.present();
      }
    });
  }

  private load(silent = false, event?: CustomEvent): void {
    const buildingId = this.buildings.selectedId;
    if (!buildingId) { this.loading = false; event?.detail.complete(); return; }

    if (!silent) { this.loading = true; this.claims = []; }
    this.error = '';

    const mine = ++this.seq;
    this.api.getClaims(buildingId, this.segment).subscribe({
      next: list => {
        event?.detail.complete();
        if (mine !== this.seq) return;
        this.claims = list;
        this.loading = false;
      },
      error: err => {
        event?.detail.complete();
        if (mine !== this.seq) return;
        this.loading = false;
        this.error = errorMessage(err, 'No se pudieron cargar los reclamos.');
      }
    });
  }

  private async toast(message: string): Promise<void> {
    const t = await this.toasts.create({ message, duration: 2500, position: 'top', color: 'success' });
    await t.present();
  }
}
