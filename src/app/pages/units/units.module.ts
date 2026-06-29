import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { UnitsPage } from './units.page';

const routes: Routes = [{ path: '', component: UnitsPage }];

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [UnitsPage]
})
export class UnitsPageModule {}
