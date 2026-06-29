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
        storage.setItem(TOKEN_KEY, res.token);
        storage.setItem(USER_KEY, JSON.stringify(res));
      })
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/auth/change-password`, { currentPassword, newPassword }).pipe(
      tap(() => {
        const user = this.getUser();
        if (user) {
          user.mustChangePassword = false;
          localStorage.setItem(USER_KEY, JSON.stringify(user));
        }
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

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }

  getUser(): LoginResponse | null {
    const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
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
