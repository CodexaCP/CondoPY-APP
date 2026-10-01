import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { PlanGateService } from './plan-gate.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  // Al cargar una pantalla salen varias requests juntas: el aviso del plan se muestra una sola vez cada pocos segundos.
  private lastPlanNoticeAt = 0;

  constructor(
    private auth: AuthService,
    private router: Router,
    private toasts: ToastController,
    private planGate: PlanGateService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const token = this.auth.getToken();
    const headers: Record<string, string> = { 'ngrok-skip-browser-warning': 'true' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const isLogin = req.url.endsWith('/auth/login');
    req = req.clone({ setHeaders: headers });

    return next.handle(req).pipe(
      catchError((error: unknown) => {
        // Sesión vencida o revocada (cuenta desactivada, rol cambiado, empresa inactiva): el backend responde 401.
        // Se cierra la sesión y se vuelve al login en vez de dejar cada pantalla con un error genérico.
        if (error instanceof HttpErrorResponse && error.status === 401 && token && !isLogin) {
          this.auth.logout();
        }

        if (error instanceof HttpErrorResponse && error.status === 403) {
          this.handlePlanRestriction(error);
        }
        return throwError(() => error);
      })
    );
  }

  // Plan vencido: la API responde 403 con error = plan_blocked (bloqueo total) o plan_read_only (solo consulta).
  // Con bloqueo total lo único que queda es "Mi plan" para enviar el pago.
  private handlePlanRestriction(error: HttpErrorResponse): void {
    const body = error.error as { error?: string; message?: string } | null;
    const code = body?.error;
    if (code !== 'plan_blocked' && code !== 'plan_read_only') return;

    if (code === 'plan_blocked') this.planGate.markBlocked();
    else this.planGate.markReadOnly();

    const now = Date.now();
    if (now - this.lastPlanNoticeAt > 4000) {
      this.lastPlanNoticeAt = now;
      void this.toasts.create({
        message: body?.message ?? 'El plan está vencido.',
        duration: 6000,
        position: 'top',
        color: 'warning'
      }).then(t => t.present());
    }

    if (code === 'plan_blocked' && !this.router.url.startsWith('/manager/plan')) {
      void this.router.navigateByUrl('/manager/plan');
    }
  }
}
