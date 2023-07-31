import { Component, OnInit } from '@angular/core';
import { MarkerInterface } from 'src/app/models/marker.interface';
import { WayPointInterface } from 'src/app/models/waypoint.interface';

declare var google: any;

@Component({
  selector: 'app-map',
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
})
export class MapPage implements OnInit {

  map = null;
  directionsService = new google.maps.DirectionsService();  // Para calcular la ruta
  directionsDisplay = new google.maps.DirectionsRenderer(); // Para mostrar la ruta

  origin = { lat: 6.25194, lng: -75.56359 };
  destination = { lat: 6.2975878, lng: -75.5586858 };

  waypoints: WayPointInterface[] = [
    { location: { lat: 6.27055735, lng: -75.5636610787523 }, stopover: true },
    { location: { lat: 6.29775, lng: -75.55029 }, stopover: true },
    { location: { lat: 6.29068, lng: -75.57552 }, stopover: true }
  ];

  constructor() { }

  ngOnInit() {
    this.loadMap();
  }

  loadMap() {
    const mapEle: HTMLElement = document.getElementById('map')!;
    const indicators: HTMLElement = document.getElementById('indicators')!;
    const myLatLng = { lat: 6.25184, lng: -75.56359 };

    this.map = new google.maps.Map(mapEle, {
      center: this.origin,
      zoom: 12
    });

    this.directionsDisplay.setMap(this.map);
    this.directionsDisplay.setPanel(indicators);

    google.maps.event.addListenerOnce(this.map, 'idle', () => {
      mapEle.classList.add('show-map');
      this.calculateRoute();
    });
  }

  private calculateRoute() {
    this.directionsService.route({
      origin: this.origin,
      destination: this.origin,
      waypoints: this.waypoints,
      optimizeWaypoints: true,
      travelMode: google.maps.TravelMode.DRIVING
    }, (response: any, status: any) => {
      if (status === google.maps.DirectionsStatus.OK) {
        this.directionsDisplay.setDirections(response);
      } else {
        alert('No se pudo mostrar la ruta debido a: ' + status);
      }
    });
  }

  addMarker(marker: MarkerInterface) {
    return new google.maps.Marker({
      position: { lat: 6.25184, lng: -75.56359 },
      map: this.map,
      title: marker.title
    });
  }

}
