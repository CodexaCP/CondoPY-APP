import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { AmenitiesPage } from './amenities.page';

const routes: Routes = [{ path: '', component: AmenitiesPage }];

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [AmenitiesPage]
})
export class AmenitiesPageModule {}
