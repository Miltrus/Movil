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
        path: 'escaner',
        canMatch: [isLoggedInGuard],
        loadChildren: () => import('../pages/escaner/escaner.module').then(m => m.Tab2PageModule)
      },
      {
        path: 'profile',
        canMatch: [isLoggedInGuard],
        loadChildren: () => import('../pages/profile/view-profile/view-profile.module').then(m => m.ViewProfilePageModule)
      },
      {
        path: 'entrega',
        canMatch: [isLoggedInGuard],
        loadChildren: () => import('../pages/entrega/entrega.module').then(m => m.EntregaPageModule)
      },

      {
        path: 'mapa',
        canMatch: [isLoggedInGuard],
        loadChildren: () => import('../pages/map/map.module').then(m => m.MapPageModule)
      }
    ]
  },

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
})
export class TabsPageRoutingModule { }
