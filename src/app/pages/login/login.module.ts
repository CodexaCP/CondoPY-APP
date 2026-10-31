import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { LoginPageRoutingModule } from './login-routing.module';
import { LoginPage } from './login.page';
import { LangSwitcherComponent } from '../../core/lang-switcher.component';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, LangSwitcherComponent, LoginPageRoutingModule],
  declarations: [LoginPage]
})
export class LoginPageModule {}
