import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ViewProfilePage } from './view-profile.page';
import { isLoggedInGuard } from 'src/app/auth/guards/is-logged-in.guard';

const routes: Routes = [
  {
    path: '',
    component: ViewProfilePage
  },
  {
    path: 'edit-profile',
    canMatch: [isLoggedInGuard],
    loadChildren: () => import('../edit-profile/edit-profile.module').then(m => m.EditProfilePageModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProfilePageRoutingModule { }
