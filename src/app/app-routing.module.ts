import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { isLoggedInGuard } from './auth/guards/is-logged-in.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'Star_Routing/welcome',
    pathMatch: 'full'
  },
  {
    path: 'Star_Routing',
    children: [
      {
        path: '',
        redirectTo: 'welcome',
        pathMatch: 'full'
      },
      {
        path: 'welcome',
        loadChildren: () => import('./pages/welcome/welcome.module').then(m => m.WelcomePageModule)
      },
      {
        path: 'login',
        loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
      },
      {
        path: 'tabs',
        canMatch: [isLoggedInGuard],
        loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule)
      }
    ]
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes)
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
