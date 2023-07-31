import { NgModule } from '@angular/core';

import { EntregaPageRoutingModule } from './entrega-routing.module';

import { EntregaPage } from './entrega.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    SharedModule,
    EntregaPageRoutingModule
  ],
  declarations: [EntregaPage]
})
export class EntregaPageModule { }
