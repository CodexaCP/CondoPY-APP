import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { SubmitPaymentPage } from './submit-payment.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule.forChild([{ path: '', component: SubmitPaymentPage }])
  ],
  declarations: [SubmitPaymentPage]
})
export class SubmitPaymentPageModule {}
