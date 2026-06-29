import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { AreaComunPage } from './area-comun.page';

const routes: Routes = [{ path: '', component: AreaComunPage }];

@NgModule({
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [AreaComunPage]
})
export class AreaComunPageModule {}
