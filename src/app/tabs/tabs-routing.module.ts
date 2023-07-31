import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';
import { isLoggedInGuard } from '../auth/guards/is-logged-in.guard';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'tab1',
        loadChildren: () => import('./tab1/tab1.module').then(m => m.Tab1PageModule)
      },
      {
        path: 'tab2',
        loadChildren: () => import('./tab2/tab2.module').then(m => m.Tab2PageModule)
      },
      {
        path: 'profile',
        canMatch: [isLoggedInGuard],
        loadChildren: () => import('./profile/view-profile/view-profile.module').then(m => m.ViewProfilePageModule)
      },
      {
        path: 'entrega',
        loadChildren: () => import('./entrega/entrega.module').then(m => m.EntregaPageModule)
      },
    ]
  },

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class TabsPageRoutingModule { }
