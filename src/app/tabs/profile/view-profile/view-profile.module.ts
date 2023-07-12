import { NgModule } from '@angular/core';

import { ProfilePageRoutingModule } from './view-profile-routing.module';

import { ViewProfilePage } from './view-profile.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    SharedModule,
    ProfilePageRoutingModule
  ],
  declarations: [
    ViewProfilePage,
  ]
})
export class ViewProfilePageModule { }
