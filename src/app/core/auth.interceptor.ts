import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private auth: AuthService) {}

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
        return throwError(() => error);
      })
    );
  }
}
