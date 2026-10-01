import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';
import { homeRouteFor, isManagerRole } from './roles';

// Ruta raíz: manda a cada usuario a su sección según el rol.
@Injectable({ providedIn: 'root' })
export class RoleRedirectGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): UrlTree {
    if (!this.auth.isLoggedIn()) return this.router.parseUrl('/login');
    if (this.auth.mustChangePassword()) return this.router.parseUrl('/change-password');
    return this.router.parseUrl(homeRouteFor(this.auth.getUser()?.role));
  }
}

// Sección del Encargado: sesión válida, sin cambio de clave pendiente y rol habilitado.
@Injectable({ providedIn: 'root' })
export class ManagerGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    if (!this.auth.isLoggedIn()) return this.router.parseUrl('/login');
    if (this.auth.mustChangePassword()) return this.router.parseUrl('/change-password');
    if (!isManagerRole(this.auth.getUser()?.role)) return this.router.parseUrl('/area');
    return true;
  }
}

// Sección de propietarios/residentes (/area): igual que AuthGuard, pero un Encargado que llegue acá
// (por ejemplo desde un enlace viejo) vuelve a su sección.
@Injectable({ providedIn: 'root' })
export class AreaGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): boolean | UrlTree {
    if (!this.auth.isLoggedIn()) return this.router.parseUrl('/login');
    if (this.auth.mustChangePassword()) return this.router.parseUrl('/change-password');
    if (isManagerRole(this.auth.getUser()?.role)) return this.router.parseUrl('/manager');
    return true;
  }
}
