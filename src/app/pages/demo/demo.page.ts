import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LangService } from '../../core/lang.service';
import { formatGs } from '../manager/manager.util';
import { DEMO_LOCKED_ICONS, REJECT_REASON_IDS, DemoClaim, DemoClaimStatus, DemoPayment, DemoReservation } from './demo.data';
import { DEMO_TX, LockedId, RejectReasonId } from './demo.i18n';
import { DemoContactKind, DemoStore } from './demo.store';

type Section = 'inicio' | 'pagos' | 'reclamos' | 'reservas' | 'mas';

// Demo del Encargado: recorre lo que hace desde el celular (pagos, reclamos, reservas) con datos ficticios.
// Es independiente del resto de la app: no usa la sesión ni llama al servidor. Los textos están en demo.i18n.ts
// (español, portugués e inglés) y siguen el idioma elegido con el selector.
@Component({
  selector: 'app-demo',
  templateUrl: './demo.page.html',
  styleUrls: ['../manager/manager.shared.scss', './demo.page.scss'],
  standalone: false,
})
export class DemoPage implements OnInit {
  readonly rejectReasons = REJECT_REASON_IDS;

  section: Section = 'inicio';
  paySegment: 'pending' | 'review' | 'done' = 'pending';
  claimSegment: DemoClaimStatus = 'Pendiente';

  payment: DemoPayment | null = null;
  rejecting = false;
  rejectReason: RejectReasonId | '' = '';
  claim: DemoClaim | null = null;

  ctaOpen = false;
  ctaFeature: LockedId = 'general';
  private autoShown = false;

  constructor(public store: DemoStore, private router: Router, private lang: LangService) {}

  ngOnInit(): void {
    this.store.reset();
    this.store.track('demo_start');
  }

  get t() { return DEMO_TX[this.lang.lang]; }
  get tasks() { return this.store.tasks; }
  get questions() { return (['units', 'method', 'pain'] as const).map(key => ({ key, ...this.t.diagnosis[key] })); }
  get buildingName(): string { return this.t.buildingName; }
  get periodName(): string {
    const now = new Date();
    return this.t.periodName(this.t.months[now.getMonth()], now.getFullYear());
  }
  get lockedInfo() { return { ...this.t.locked[this.ctaFeature], icon: DEMO_LOCKED_ICONS[this.ctaFeature] }; }

  gs(v: number | null | undefined): string { return formatGs(v); }

  // Fechas en el formato del idioma elegido (en inglés con el mes abreviado, para que día y mes no se confundan).
  date(v: string): string {
    const opts: Intl.DateTimeFormatOptions = this.lang.lang === 'en' ? { day: '2-digit', month: 'short', year: 'numeric' } : { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(v).toLocaleDateString(this.lang.locale, opts);
  }

  dateTime(v: string): string {
    const opts: Intl.DateTimeFormatOptions = this.lang.lang === 'en'
      ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(v).toLocaleString(this.lang.locale, opts);
  }

  dayLabel(offset: number): string {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString(this.lang.locale, { weekday: 'long', day: '2-digit', month: this.lang.lang === 'en' ? 'short' : '2-digit' });
  }

  go(s: Section): void { this.section = s; }
  exit(): void { void this.router.navigateByUrl('/login'); }

  openCta(feature: LockedId = 'general'): void {
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

  payLabel(s: DemoPayment['status']): string { return this.t.payStatus[s] ?? s; }

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

  claimLabel(s: DemoClaimStatus): string { return this.t.claimStatus[s] ?? s; }

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
  reservationLabel(s: DemoReservation['status']): string { return this.t.reservationStatus[s] ?? s; }

  reservationClass(s: string): string {
    return ({ Pending: 'warn', Approved: 'ok', Rejected: 'danger' } as Record<string, string>)[s] ?? 'muted';
  }

  reviewReservation(r: DemoReservation, approved: boolean): void {
    this.store.reviewReservation(r, approved);
    this.afterAction();
  }
}
