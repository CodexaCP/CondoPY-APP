import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { SettlementReviewPage } from './settlement-review.page';

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild([{ path: '', component: SettlementReviewPage }])],
  declarations: [SettlementReviewPage]
})
export class SettlementReviewPageModule {}
