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
      {
        path: 'payments',
        loadChildren: () => import('../payments/payments.module').then(m => m.PaymentsPageModule)
      },
      {
        path: 'payments/:id',
        loadChildren: () => import('../payment-detail/payment-detail.module').then(m => m.PaymentDetailPageModule)
      },
      {
        path: 'submit-payment',
        loadChildren: () => import('../submit-payment/submit-payment.module').then(m => m.SubmitPaymentPageModule)
      },
      {
        path: 'notifications',
        loadChildren: () => import('../notifications/notifications.module').then(m => m.NotificationsPageModule)
      },
      {
        path: 'dashboard',
        loadChildren: () => import('./dashboard/dashboard.module').then(m => m.DashboardPageModule)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [AreaPage]
})
export class AreaPageModule {}
