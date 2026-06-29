import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { finalize } from 'rxjs';
import { ClaimsService } from '../../core/claims.service';
import { AuthService } from '../../core/auth.service';
import { Claim, ClaimCategory, MyUnit } from '../../core/models';

@Component({
  selector: 'app-claims',
  templateUrl: './claims.page.html',
  styleUrls: ['./claims.page.scss'],
  standalone: false,
})
export class ClaimsPage implements OnInit {
  units: MyUnit[] = [];
  claims: Claim[] = [];
  selectedUnitId = '';
  category: ClaimCategory = 'Otro';
  description = '';
  loading = true;
  saving = false;
  error = '';

  readonly categories: ClaimCategory[] = ['Ruido', 'Limpieza', 'Mantenimiento', 'Otro'];

  constructor(
    private readonly auth: AuthService,
    private readonly claimsService: ClaimsService,
    private readonly navCtrl: NavController
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ionViewWillEnter(): void {
    this.loadClaims();
  }

  get selectedUnit(): MyUnit | null {
    return this.units.find(x => x.unitId === this.selectedUnitId) ?? null;
  }

  loadData(event?: CustomEvent): void {
    this.loading = true;
    this.error = '';

    this.auth.getMyUnits().subscribe({
      next: units => {
        this.units = units;
        if (!this.selectedUnitId && units.length > 0) {
          this.selectedUnitId = units.find(x => x.isPrimary)?.unitId ?? units[0].unitId;
        }
        this.loadClaims(event);
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudieron cargar tus unidades.';
        event?.detail.complete();
      }
    });
  }

  loadClaims(event?: CustomEvent): void {
    this.claimsService.getMine().subscribe({
      next: claims => {
        this.claims = claims;
        this.loading = false;
        event?.detail.complete();
      },
      error: () => {
        this.loading = false;
        this.error = 'No se pudo cargar el historial de reclamos.';
        event?.detail.complete();
      }
    });
  }

  submit(): void {
    const description = this.description.trim();

    if (!this.selectedUnitId) {
      this.error = 'Seleccioná una unidad.';
      return;
    }

    if (!description) {
      this.error = 'La descripción es obligatoria.';
      return;
    }

    this.error = '';
    this.saving = true;

    this.claimsService.create({
      unitId: this.selectedUnitId,
      category: this.category,
      description
    }).pipe(finalize(() => this.saving = false)).subscribe({
      next: claim => {
        this.claims = [claim, ...this.claims];
        this.description = '';
        this.category = 'Otro';
      },
      error: (err) => {
        const body = err?.error;
        this.error = (typeof body === 'string' ? body : body?.message) ?? 'No se pudo enviar el reclamo.';
      }
    });
  }

  statusLabel(status: string): string {
    return status === 'EnProceso' ? 'En proceso' : status;
  }

  dateLabel(value: string): string {
    return new Date(value).toLocaleString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  goBack(): void {
    this.navCtrl.back();
  }
}
