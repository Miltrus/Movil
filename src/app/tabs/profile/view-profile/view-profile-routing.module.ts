import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ViewProfilePage } from './view-profile.page';

const routes: Routes = [
  {
    path: '',
    component: ViewProfilePage
  },
  {
    path: 'edit-profile',
    loadChildren: () => import('../edit-profile/edit-profile.module').then(m => m.EditProfilePageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProfilePageRoutingModule { }
