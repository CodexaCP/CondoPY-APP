import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { MarketplacePage } from './marketplace.page';
import { MarketplaceFormPage } from './marketplace-form.page';

const routes: Routes = [
  { path: '', component: MarketplacePage },
  { path: 'new', component: MarketplaceFormPage },
  { path: ':id/edit', component: MarketplaceFormPage }
];

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [MarketplacePage, MarketplaceFormPage]
})
export class MarketplacePageModule {}
