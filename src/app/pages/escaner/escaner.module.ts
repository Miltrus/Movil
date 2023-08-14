import { NgModule } from '@angular/core';
import { EscanerPage } from './escaner.page';

import { EscanerPageRoutingModule } from './escaner-routing.module';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    SharedModule,
    EscanerPageRoutingModule
  ],
  declarations: [EscanerPage]
})
export class Tab2PageModule { }
