import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  form = { email: '', password: '' };
  rememberMe = false;
  loading = false;
  submitted = false;
  showPass = false;
  errorMsg = '';

  constructor(private auth: AuthService, private router: Router) {}

  submit(): void {
    this.submitted = true;
    if (!this.form.email || !this.form.password) return;

    this.loading = true;
    this.errorMsg = '';

    this.auth.login(this.form, this.rememberMe).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.mustChangePassword) {
          this.router.navigateByUrl('/change-password');
        } else {
          this.router.navigateByUrl('/home');
        }
      },
      error: (err) => {
        this.loading = false;
        const body = err?.error;
        if (body?.error === 'duplicate_username') {
          this.errorMsg = body.message ?? 'Usuario con múltiples empresas. Usa usuario@empresa.';
        } else if (err.status === 401) {
          this.errorMsg = 'Usuario o contraseña incorrectos.';
        } else {
          this.errorMsg = 'No se pudo conectar. Verifica tu conexión.';
        }
      }
    });
  }
}
