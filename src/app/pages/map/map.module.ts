import { NgModule } from '@angular/core';

import { MapPageRoutingModule } from './map-routing.module';

import { MapPage } from './map.page';
import { SharedModule } from 'src/app/shared/shared.module';

@NgModule({
  imports: [
    SharedModule,
    MapPageRoutingModule
  ],
  declarations: [MapPage]
})
export class MapPageModule { }
