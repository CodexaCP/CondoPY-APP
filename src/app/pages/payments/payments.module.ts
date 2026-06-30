import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { PaymentsPage } from './payments.page';

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild([{ path: '', component: PaymentsPage }])],
  declarations: [PaymentsPage]
})
export class PaymentsPageModule {}

