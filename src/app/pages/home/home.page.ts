import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { LoginResponse } from '../../core/models';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  user: LoginResponse | null = null;

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

  goToAreaIndividual(): void {
    this.router.navigateByUrl('/area');
  }

  goToAreaComun(): void {
    this.router.navigateByUrl('/area-comun');
  }
}
