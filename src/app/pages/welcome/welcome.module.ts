import { NgModule } from '@angular/core';

import { WelcomePageRoutingModule } from './welcome-routing.module';

import { WelcomePage } from './welcome.page';
import { SharedModule } from 'src/app/shared/shared.module';


@NgModule({
  imports: [
    SharedModule,
    WelcomePageRoutingModule
  ],
  declarations: [WelcomePage,]
})
export class WelcomePageModule { }
