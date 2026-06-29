import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { LoginResponse } from '../../core/models';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false,
})
export class ProfilePage implements OnInit {
  user: LoginResponse | null = null;
  cp = { current: '', newPass: '', confirm: '' };
  passLoading = false;
  passError = '';
  passDone = false;

  get initials(): string {
    return (this.user?.fullName ?? '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  get roleLabel(): string {
    const map: Record<string, string> = { Owner: 'Propietario', Resident: 'Residente', Porter: 'Encargado' };
    return map[this.user?.role ?? ''] ?? this.user?.role ?? '';
  }

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.user = this.auth.getUser();
  }

  changePass(): void {
    if (this.cp.newPass !== this.cp.confirm) {
      this.passError = 'Las contraseñas no coinciden.';
      return;
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/.test(this.cp.newPass)) {
      this.passError = 'Mínimo 8 caracteres, una mayúscula, una minúscula y un carácter especial.';
      return;
    }
    this.passLoading = true;
    this.passError = '';
    this.auth.changePassword(this.cp.current, this.cp.newPass).subscribe({
      next: () => {
        this.passLoading = false;
        this.passDone = true;
        this.cp = { current: '', newPass: '', confirm: '' };
      },
      error: (err) => {
        this.passLoading = false;
        const body = err?.error;
        this.passError = (typeof body === 'string' ? body : body?.message) ?? 'No se pudo cambiar la contraseña.';
      }
    });
  }

  goHome(): void { this.router.navigateByUrl('/home'); }

  goClaims(): void {
    this.router.navigateByUrl('/area/claims');
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
