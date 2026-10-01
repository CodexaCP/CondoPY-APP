import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/auth.guard';
import { AreaGuard, ManagerGuard, RoleRedirectGuard } from './core/role.guard';

const routes: Routes = [
  // La raíz manda a cada usuario a su sección según el rol (Encargado → /manager, el resto → /area).
  { path: '', pathMatch: 'full', canActivate: [RoleRedirectGuard], children: [] },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'forgot-password',
    loadChildren: () => import('./pages/forgot-password/forgot-password.module').then(m => m.ForgotPasswordPageModule)
  },
  {
    path: 'change-password',
    loadChildren: () => import('./pages/change-password/change-password.module').then(m => m.ChangePasswordPageModule)
  },
  {
    path: 'home',
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/home/home.module').then(m => m.HomePageModule)
  },
  {
    path: 'area',
    canActivate: [AreaGuard],
    loadChildren: () => import('./pages/area/area.module').then(m => m.AreaPageModule)
  },
  {
    path: 'area-comun',
    canActivate: [AuthGuard],
    loadChildren: () => import('./pages/area-comun/area-comun.module').then(m => m.AreaComunPageModule)
  },
  {
    path: 'manager',
    canActivate: [ManagerGuard],
    loadChildren: () => import('./pages/manager/manager.module').then(m => m.ManagerPageModule)
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
