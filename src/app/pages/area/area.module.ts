import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { AreaPage } from './area.page';

const routes: Routes = [
  {
    path: '',
    component: AreaPage,
    children: [
      {
        path: 'units',
        loadChildren: () => import('../units/units.module').then(m => m.UnitsPageModule)
      },
      {
        path: 'account',
        loadChildren: () => import('../account/account.module').then(m => m.AccountPageModule)
      },
      {
        path: 'profile',
        loadChildren: () => import('../profile/profile.module').then(m => m.ProfilePageModule)
      },
      {
        path: 'claims',
        loadChildren: () => import('../claims/claims.module').then(m => m.ClaimsPageModule)
      },
      { path: '', redirectTo: 'units', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [AreaPage]
})
export class AreaPageModule {}
