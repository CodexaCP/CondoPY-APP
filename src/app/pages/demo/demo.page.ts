import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { formatGs, fmtDate, fmtDateTime } from '../manager/manager.util';
import {
  DEMO_BUILDING_NAME, DEMO_DIAGNOSIS, DEMO_LOCKED, REJECT_REASONS, demoPeriodName,
  DemoClaim, DemoClaimStatus, DemoPayment, DemoReservation
} from './demo.data';
import { DEMO_TASKS, DemoContactKind, DemoStore } from './demo.store';

type Section = 'inicio' | 'pagos' | 'reclamos' | 'reservas' | 'mas';

// Demo del Encargado: recorre lo que hace desde el celular (pagos, reclamos, reservas) con datos ficticios.
// Es independiente del resto de la app: no usa la sesión ni llama al servidor.
@Component({
  selector: 'app-demo',
  templateUrl: './demo.page.html',
  styleUrls: ['../manager/manager.shared.scss', './demo.page.scss'],
  standalone: false,
})
export class DemoPage implements OnInit {
  readonly tasks = DEMO_TASKS;
  readonly questions = DEMO_DIAGNOSIS;
  readonly rejectReasons = REJECT_REASONS;
  readonly buildingName = DEMO_BUILDING_NAME;
  readonly periodName = demoPeriodName();

  section: Section = 'inicio';
  paySegment: 'pending' | 'review' | 'done' = 'pending';
  claimSegment: DemoClaimStatus = 'Pendiente';

  payment: DemoPayment | null = null;
  rejecting = false;
  rejectReason = '';
  claim: DemoClaim | null = null;

  ctaOpen = false;
  ctaFeature = 'general';
  private autoShown = false;

  constructor(public store: DemoStore, private router: Router) {}

  ngOnInit(): void {
    this.store.reset();
    this.store.track('demo_start');
  }

  get lockedInfo() { return DEMO_LOCKED[this.ctaFeature] ?? DEMO_LOCKED['general']; }

  gs(v: number | null | undefined): string { return formatGs(v); }
  date(v: string): string { return fmtDate(v); }
  dateTime(v: string): string { return fmtDateTime(v); }

  go(s: Section): void { this.section = s; }
  exit(): void { void this.router.navigateByUrl('/login'); }

  openCta(feature = 'general'): void {
    this.ctaFeature = feature;
    this.ctaOpen = true;
    if (feature !== 'general') this.store.track('locked_click', feature);
  }

  closeCta(): void { this.ctaOpen = false; }

  contact(kind: DemoContactKind): void {
    this.store.track('contact_click', kind);
    const url = this.store.whatsappUrl(kind);
    if (url) window.open(url, '_system');
  }

  // Al completar la última tarea se abre el cierre una sola vez.
  private afterAction(): void {
    if (this.store.allDone && !this.autoShown) {
      this.autoShown = true;
      setTimeout(() => this.openCta('general'), 600);
    }
  }

  // ── Pagos ──────────────────────────────────────────────────────────────
  get payments(): DemoPayment[] {
    const by = {
      pending: (p: DemoPayment) => p.status === 'Pending',
      review: (p: DemoPayment) => p.status === 'UnderReview',
      done: (p: DemoPayment) => p.status === 'Approved' || p.status === 'Rejected'
    }[this.paySegment];
    return this.store.payments.filter(by);
  }

  payLabel(s: string): string {
    return ({ Pending: 'Por revisar', UnderReview: 'En revisión', Approved: 'Aprobado', Rejected: 'Rechazado' } as Record<string, string>)[s] ?? s;
  }

  payClass(s: string): string {
    return ({ Pending: 'warn', UnderReview: 'info', Approved: 'ok', Rejected: 'danger' } as Record<string, string>)[s] ?? 'muted';
  }

  openPayment(p: DemoPayment): void {
    this.payment = p;
    this.rejecting = false;
    this.rejectReason = '';
  }

  closePayment(): void { this.payment = null; this.rejecting = false; }

  verifyAndApprove(): void { if (this.payment) { this.store.approve(this.payment); this.closePayment(); this.afterAction(); } }
  verifyOnly(): void { if (this.payment) { this.store.verifyOnly(this.payment); this.closePayment(); this.afterAction(); } }

  confirmReject(): void {
    if (!this.payment || !this.rejectReason) return;
    this.store.reject(this.payment, this.rejectReason);
    this.closePayment();
    this.afterAction();
  }

  // ── Reclamos ───────────────────────────────────────────────────────────
  get claims(): DemoClaim[] { return this.store.claims.filter(c => c.status === this.claimSegment); }

  claimLabel(s: string): string {
    return ({ Pendiente: 'Pendiente', EnProceso: 'En proceso', Resuelto: 'Resuelto' } as Record<string, string>)[s] ?? s;
  }

  claimClass(s: string): string {
    return ({ Pendiente: 'warn', EnProceso: 'info', Resuelto: 'ok' } as Record<string, string>)[s] ?? 'muted';
  }

  closeClaim(): void { this.claim = null; }

  changeClaim(status: DemoClaimStatus): void {
    if (!this.claim) return;
    this.store.setClaimStatus(this.claim, status);
    this.claim = null;
    this.afterAction();
  }

  // ── Reservas ───────────────────────────────────────────────────────────
  reservationLabel(s: string): string {
    return ({ Pending: 'Por revisar', Approved: 'Aprobada', Rejected: 'Rechazada' } as Record<string, string>)[s] ?? s;
  }

  reservationClass(s: string): string {
    return ({ Pending: 'warn', Approved: 'ok', Rejected: 'danger' } as Record<string, string>)[s] ?? 'muted';
  }

  reviewReservation(r: DemoReservation, approved: boolean): void {
    this.store.reviewReservation(r, approved);
    this.afterAction();
  }
}
