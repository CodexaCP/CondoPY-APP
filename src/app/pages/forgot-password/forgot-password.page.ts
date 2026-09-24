import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: false,
})
export class ForgotPasswordPage {
  identifier = '';
  loading = false;
  errorMsg = '';
  sent = false;

  constructor(private auth: AuthService, private navCtrl: NavController) {}

  submit(): void {
    if (!this.identifier.trim()) {
      this.errorMsg = 'Ingresá tu correo o nombre de usuario.';
      return;
    }

    this.errorMsg = '';
    this.loading = true;

    this.auth.forgotPassword(this.identifier).subscribe({
      next: () => { this.loading = false; this.sent = true; },
      // Respuesta generica tambien ante error: no revela si el dato existe.
      error: () => { this.loading = false; this.sent = true; }
    });
  }

  back(): void {
    this.navCtrl.navigateBack('/login');
  }
}
