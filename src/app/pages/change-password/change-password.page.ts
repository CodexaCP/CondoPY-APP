import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-change-password',
  templateUrl: './change-password.page.html',
  styleUrls: ['./change-password.page.scss'],
  standalone: false,
})
export class ChangePasswordPage {
  current = '';
  newPass = '';
  confirm = '';
  loading = false;
  errorMsg = '';

  constructor(private auth: AuthService, private router: Router) {}

  submit(): void {
    if (this.newPass !== this.confirm) {
      this.errorMsg = 'Las contraseñas no coinciden.';
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/.test(this.newPass)) {
      this.errorMsg = 'Mínimo 8 caracteres, una mayúscula, una minúscula y un carácter especial.';
      return;
    }
    this.loading = true;
    this.errorMsg = '';
    this.auth.changePassword(this.current, this.newPass).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigateByUrl('/home');
      },
      error: (err) => {
        this.loading = false;
        const body = err?.error;
        this.errorMsg = (typeof body === 'string' ? body : body?.message) ?? 'No se pudo cambiar la contraseña.';
      }
    });
  }
}
