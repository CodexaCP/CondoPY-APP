import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginRequest, LoginResponse, MyUnit } from './models';

const TOKEN_KEY = 'condopy_token';
const USER_KEY  = 'condopy_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private http: HttpClient, private router: Router) {}

  login(request: LoginRequest, rememberMe = false): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, request).pipe(
      tap(res => {
        const storage = rememberMe ? localStorage : sessionStorage;
        const other = rememberMe ? sessionStorage : localStorage;
        // Limpiar la otra storage: una sesión vieja (de "Recordarme" o de otra cuenta) ahí
        // pisaría a esta, porque getToken()/getUser() prefieren localStorage siempre.
        other.removeItem(TOKEN_KEY);
        other.removeItem(USER_KEY);
        storage.setItem(TOKEN_KEY, res.token);
        storage.setItem(USER_KEY, JSON.stringify(res));
      })
    );
  }

  forgotPassword(identifier: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/forgot-password`, { identifier: identifier.trim() });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/change-password`, { currentPassword, newPassword }).pipe(
      tap(() => {
        // Actualizar mustChangePassword en la MISMA storage donde vive la sesión activa
        // (no siempre localStorage: si el login fue sin "Recordarme", es sessionStorage).
        // Escribirlo en la storage equivocada dejaba el flag viejo (true) en la sesión real,
        // así que el guard volvía a mandar a /change-password sin avisar nada.
        const storage = this.getStorage();
        if (!storage) return;

        const raw = storage.getItem(USER_KEY);
        if (!raw) return;

        const user = JSON.parse(raw) as LoginResponse;
        user.mustChangePassword = false;
        storage.setItem(USER_KEY, JSON.stringify(user));
      })
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.router.navigateByUrl('/login');
  }

  // Storage donde vive la sesión activa (token real), no una prioridad fija: evita mezclar el
  // token de una storage con el usuario de la otra si quedó algo residual de una sesión previa.
  private getStorage(): Storage | null {
    if (localStorage.getItem(TOKEN_KEY)) return localStorage;
    if (sessionStorage.getItem(TOKEN_KEY)) return sessionStorage;
    return null;
  }

  getToken(): string | null {
    return this.getStorage()?.getItem(TOKEN_KEY) ?? null;
  }

  getUser(): LoginResponse | null {
    const raw = this.getStorage()?.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  mustChangePassword(): boolean {
    return this.getUser()?.mustChangePassword ?? false;
  }

  getMyUnits(): Observable<MyUnit[]> {
    return this.http.get<MyUnit[]>(`${environment.apiUrl}/me/units`);
  }
}
