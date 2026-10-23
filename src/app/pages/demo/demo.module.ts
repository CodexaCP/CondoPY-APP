import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { DemoPage } from './demo.page';

// Demo pública del Encargado (/demo): sin sesión, con datos ficticios y sin llamadas al servidor.
const routes: Routes = [{ path: '', component: DemoPage }];

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule.forChild(routes)],
  declarations: [DemoPage]
})
export class DemoPageModule {}
