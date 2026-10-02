import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';

import { ManagerPage } from './manager.page';
import { BuildingSwitcherComponent } from './building-switcher.component';
import { ManagerDashboardPage } from './dashboard/manager-dashboard.page';
import { ManagerPaymentsPage } from './payments/manager-payments.page';
import { ManagerPaymentDetailPage } from './payments/manager-payment-detail.page';
import { ManagerClaimsPage } from './claims/manager-claims.page';
import { ManagerReservationsPage } from './reservations/manager-reservations.page';
import { ManagerMorePage } from './more/manager-more.page';
import { ManagerPlanPage } from './plan/manager-plan.page';
import { ManagerMarketplacePage } from './marketplace/manager-marketplace.page';

// Sección del Encargado de edificio (/manager). Ver docs/ESPECIFICACION_APP_ENCARGADO.md en el repo del backend.
const routes: Routes = [
  {
    path: '',
    component: ManagerPage,
    children: [
      { path: 'dashboard', component: ManagerDashboardPage },
      { path: 'payments', component: ManagerPaymentsPage },
      { path: 'payments/:id', component: ManagerPaymentDetailPage },
      { path: 'claims', component: ManagerClaimsPage },
      { path: 'reservations', component: ManagerReservationsPage },
      { path: 'more', component: ManagerMorePage },
      { path: 'plan', component: ManagerPlanPage },
      { path: 'marketplace', component: ManagerMarketplacePage },
      {
        // Se reutiliza la pantalla de notificaciones de la app; el destino de cada aviso depende del rol.
        path: 'notifications',
        loadChildren: () => import('../notifications/notifications.module').then(m => m.NotificationsPageModule)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [
    ManagerPage,
    BuildingSwitcherComponent,
    ManagerDashboardPage,
    ManagerPaymentsPage,
    ManagerPaymentDetailPage,
    ManagerClaimsPage,
    ManagerReservationsPage,
    ManagerMorePage,
    ManagerPlanPage,
    ManagerMarketplacePage
  ]
})
export class ManagerPageModule {}
