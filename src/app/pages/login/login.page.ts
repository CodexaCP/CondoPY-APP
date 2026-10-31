import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { PushService } from '../../core/push.service';
import { NotificationAlertService } from '../../core/notification-alert.service';
import { LangService } from '../../core/lang.service';
import { LOGIN_TX } from './login.i18n';

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

  constructor(private auth: AuthService, private router: Router, private pushSvc: PushService, private alerts: NotificationAlertService, private lang: LangService) {}

  // Textos en el idioma elegido (selector de la esquina) o, si nunca eligió, el del teléfono.
  get t() { return LOGIN_TX[this.lang.lang].login; }

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
          this.pushSvc.init();
          // Primera consulta ya (deja la marca de base); el resto sigue cada 30 s.
          void this.alerts.refresh();
          this.router.navigateByUrl('/');
        }
      },
      error: (err) => {
        this.loading = false;
        const body = err?.error;
        if (body?.error === 'duplicate_username') {
          this.errorMsg = body.message ?? this.t.errMultiCompany;
        } else if (err.status === 401) {
          this.errorMsg = this.t.errWrong;
        } else {
          this.errorMsg = this.t.errOffline;
        }
      }
    });
  }

  goDemo(): void {
    this.router.navigateByUrl('/demo');
  }

  goForgotPassword(): void {
    this.router.navigateByUrl('/forgot-password');
  }
}
