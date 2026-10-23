import { Injectable } from '@angular/core';
import { salesWhatsAppUrlFor } from '../../core/sales.config';
import {
  DEMO_CASH, DEMO_CHARGED, DEMO_COLLECTED, DEMO_OVERDUE, DEMO_PAIN_RECOMMENDATION, DEMO_UNITS_IN_ARREARS,
  DemoClaim, DemoClaimStatus, DemoPayment, DemoReservation, buildDemoClaims, buildDemoPayments, buildDemoReservations
} from './demo.data';

export interface DemoTask {
  id: 'pago' | 'reclamo' | 'reserva';
  title: string;
  hint: string;
  section: 'pagos' | 'reclamos' | 'reservas';
  icon: string;
}

// Las tres cosas que el Encargado resuelve a diario desde el celular.
export const DEMO_TASKS: DemoTask[] = [
  { id: 'pago', title: 'Aprueba un pago', hint: 'Abrí un pago, mirá el comprobante y aprobalo o rechazalo.', section: 'pagos', icon: 'wallet-outline' },
  { id: 'reclamo', title: 'Resuelve un reclamo', hint: 'Pasá un reclamo a «En proceso» o marcalo como resuelto.', section: 'reclamos', icon: 'chatbubble-ellipses-outline' },
  { id: 'reserva', title: 'Responde una reserva', hint: 'Aprobá o rechazá una reserva de un espacio común.', section: 'reservas', icon: 'calendar-outline' }
];

export type DemoContactKind = 'presupuesto' | 'demostracion' | 'planes';

const EVENTS_KEY = 'expenses-app-demo-events';
const ANON_KEY = 'expenses-app-demo-anon';

// Estado en memoria de la demo del Encargado. Nada de esto toca al servidor ni a la sesión real.
@Injectable({ providedIn: 'root' })
export class DemoStore {
  payments: DemoPayment[] = buildDemoPayments();
  claims: DemoClaim[] = buildDemoClaims();
  reservations: DemoReservation[] = buildDemoReservations();
  done: string[] = [];
  answers: { units?: string; method?: string; pain?: string } = {};

  private approvedExtra = 0;

  get charged(): number { return DEMO_CHARGED; }
  get collected(): number { return DEMO_COLLECTED + this.approvedExtra; }
  get rate(): number { return Math.round((this.collected / DEMO_CHARGED) * 100); }
  get overdue(): number { return DEMO_OVERDUE; }
  get unitsInArrears(): number { return DEMO_UNITS_IN_ARREARS; }
  get cash(): number { return DEMO_CASH + this.approvedExtra; }

  get pendingPayments(): number { return this.payments.filter(p => p.status === 'Pending').length; }
  get reviewPayments(): number { return this.payments.filter(p => p.status === 'UnderReview').length; }
  get pendingClaims(): number { return this.claims.filter(c => c.status === 'Pendiente').length; }
  get pendingReservations(): number { return this.reservations.filter(r => r.status === 'Pending').length; }

  get allDone(): boolean { return this.done.length >= DEMO_TASKS.length; }
  get diagnosisDone(): boolean { return !!(this.answers.units && this.answers.method && this.answers.pain); }
  get recommendation(): string { return DEMO_PAIN_RECOMMENDATION[this.answers.pain ?? ''] ?? ''; }

  isDone(id: string): boolean { return this.done.includes(id); }

  // Verifica el monto y deja el pago «en revisión» (como la opción «Solo verificar monto» de la app real).
  verifyOnly(p: DemoPayment): void {
    p.reviewedAmount = p.declaredAmount;
    p.status = 'UnderReview';
    this.complete('pago');
  }

  approve(p: DemoPayment): void {
    if (p.status === 'Approved') return;
    p.reviewedAmount = p.reviewedAmount ?? p.declaredAmount;
    p.status = 'Approved';
    this.approvedExtra += p.reviewedAmount;
    this.complete('pago');
  }

  reject(p: DemoPayment, reason: string): void {
    p.status = 'Rejected';
    p.rejectionReason = reason;
    this.complete('pago');
  }

  setClaimStatus(c: DemoClaim, status: DemoClaimStatus): void {
    c.status = status;
    this.complete('reclamo');
  }

  reviewReservation(r: DemoReservation, approved: boolean): void {
    r.status = approved ? 'Approved' : 'Rejected';
    this.complete('reserva');
  }

  complete(id: DemoTask['id']): void {
    if (this.done.includes(id)) return;
    this.done = [...this.done, id];
    this.track('task_complete', id);
    if (this.allDone) this.track('demo_complete');
  }

  answer(key: 'units' | 'method' | 'pain', value: string): void {
    const was = this.diagnosisDone;
    this.answers = { ...this.answers, [key]: value };
    if (!was && this.diagnosisDone) this.track('diagnosis_done', Object.values(this.answers).join(' | '));
  }

  reset(): void {
    this.payments = buildDemoPayments();
    this.claims = buildDemoClaims();
    this.reservations = buildDemoReservations();
    this.done = [];
    this.answers = {};
    this.approvedExtra = 0;
  }

  // Mensaje de WhatsApp para el cierre comercial: dice qué probó la persona y cuál es su necesidad.
  whatsappUrl(kind: DemoContactKind): string | null {
    const tried = DEMO_TASKS.filter(t => this.isDone(t.id)).map(t => t.title.toLowerCase());
    const intro: Record<DemoContactKind, string> = {
      presupuesto: 'Hola, probé la demo de la app de Expenses y quiero pedir un presupuesto para mi edificio.',
      demostracion: 'Hola, probé la demo de la app de Expenses y quiero solicitar una demostración personalizada.',
      planes: 'Hola, probé la demo de la app de Expenses y quiero consultar planes y condiciones.'
    };
    const tail = tried.length ? ` En la demo probé: ${tried.join(', ')}.` : '';
    const a = this.answers;
    const profile = this.diagnosisDone ? ` Administro ${(a.units ?? '').toLowerCase()} unidades, hoy llevo las expensas con ${(a.method ?? '').toLowerCase()} y lo que más me preocupa es: ${(a.pain ?? '').toLowerCase()}.` : '';
    return salesWhatsAppUrlFor(intro[kind] + tail + profile);
  }

  // Medición del embudo en el dispositivo (no se envía a ningún servidor).
  track(event: string, detail?: string): void {
    try {
      const raw = localStorage.getItem(EVENTS_KEY);
      const list: { t: number; e: string; d?: string; a: string }[] = raw ? JSON.parse(raw) : [];
      list.push({ t: Date.now(), e: event, d: detail, a: this.anonId() });
      localStorage.setItem(EVENTS_KEY, JSON.stringify(list.slice(-100)));
    } catch {
      // Sin almacenamiento: la demo funciona igual.
    }
  }

  private anonId(): string {
    try {
      let id = localStorage.getItem(ANON_KEY);
      if (!id) {
        id = Math.random().toString(36).slice(2, 10);
        localStorage.setItem(ANON_KEY, id);
      }
      return id;
    } catch {
      return 'anon';
    }
  }
}
