import { Component, OnDestroy } from '@angular/core';
import { LoadingController, NavController } from '@ionic/angular';
import { WayPointInterface } from 'src/app/models/waypoint.interface';

declare var google: any;

@Component({
  selector: 'app-map',
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
})
export class MapPage {

  map = null;
  mapEle: any;
  indicators: any;
  directionsService = new google.maps.DirectionsService();  // para calcular la ruta
  directionsDisplay = new google.maps.DirectionsRenderer(); // para mostrar la ruta
  marker: google.maps.Marker | null = null; // para el marcador de la ubicación actual
  locationWatchId: number | null = null; // para almacenar el id de la suscripción de watchPosition
  currentWaypointIndex: number = 0;
  shouldCalculateRoute: boolean = true;

  origin: { lat: number, lng: number } = { lat: 0, lng: 0 };
  destination = { lat: 6.26732, lng: -75.59406 };

  waypoints: WayPointInterface[] = [
    { location: { lat: 6.29747, lng: -75.55033 }, stopover: true },
    { location: { lat: 6.28923, lng: -75.54613 }, stopover: true },
    { location: { lat: 6.14983, lng: -75.60969 }, stopover: true },
    { location: { lat: 6.10601, lng: -75.63808 }, stopover: true },
  ];

  constructor(
    private loading: LoadingController,
    private nav: NavController,
  ) { }

  ionViewDidEnter() {
    this.shouldCalculateRoute = true;
    this.clearCurrentLocationMarker();
    this.loadMap();
  }

  ionViewWillLeave() {
    // cancelar la suscripción de watchPosition al salir de la página
    if (this.locationWatchId !== null) {
      navigator.geolocation.clearWatch(this.locationWatchId);
    }
    this.shouldCalculateRoute = false;
  }

  async loadMap() {
    this.mapEle = document.getElementById('map')!;
    this.indicators = document.getElementById('indicators')!;

    this.map = new google.maps.Map(this.mapEle, {
      center: this.origin,
      zoom: 12
    });

    this.directionsDisplay.setMap(this.map);
    this.directionsDisplay.setPanel(this.indicators);

    google.maps.event.addListenerOnce(this.map, 'idle', async () => {
      this.mapEle.classList.add('show-map');
      await this.getCurrentLocation();
      this.calculateRoute();
    });
  }

  async getCurrentLocation() {
    if (navigator.geolocation) {
      const geolocationOptions = {
        enableHighAccuracy: true, // máxima precisión posible
        timeout: 10000, // time maximo para esperar la respuesta
        maximumAge: 0 // no usar la caché de la ubicación anterior
      };

      let attempts = 0;
      const maxAttempts = 10;

      // funcion recursiva para intentar obtener la ubicacion
      const tryGetLocation = () => {
        this.locationWatchId = navigator.geolocation.watchPosition(
          (position) => {
            const currentLatLng = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };

            this.origin = currentLatLng;
            this.updateMarkerPosition(currentLatLng);

            console.log("nueva ubicación:", currentLatLng);
          },
          (error) => {
            console.warn('error al obtener la ubicación actual:', error);
            if (attempts < maxAttempts) {
              attempts++;
              console.log(`intento ${attempts} de ${maxAttempts}`);
              // intentamo obtener la ubicacion nuevamente despues de 1 segundo
              setTimeout(() => {
                tryGetLocation();
              }, 1000);
            } else {
              alert('No se pudo obtener la ubicación actual después de varios intentos.');
            }
          },
          geolocationOptions // pasamos las opciones para la geolocalizacion
        );
      };

      // llamamos la función recursiva para obtener la ubicación
      tryGetLocation();
    } else {
      console.error('El navegador no admite la geolocalización.');
      alert('El navegador no admite la geolocalización.');
    }
  }



  async calculateRoute() {
    const loading = await this.loading.create({
      message: 'Calculando la ruta...'
    });
    await loading.present();

    let attempts = 0;
    const maxAttempts = 10;

    // funcion recursiva para intentar calcular la ruta
    const tryCalculateRoute = () => {

      this.directionsService.route({
        origin: this.origin,
        destination: this.destination,
        waypoints: this.waypoints,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING
      }, (response: any, status: any) => {

        if (status === google.maps.DirectionsStatus.OK) {
          this.directionsDisplay.setDirections(response);

          // verificar si se ha llegado a un waypoint
          const route = response.routes[0];
          const legs = route.legs;
          const currentLeg = legs[this.currentWaypointIndex];
          const waypointLatLng = this.waypoints[this.currentWaypointIndex].location;

          if (this.shouldCalculateRoute) {
            if (this.isCloseToWaypoint(this.origin, waypointLatLng)) {
              console.log(`Llegaste al waypoint ${this.currentWaypointIndex + 1}`, currentLeg);
              this.currentWaypointIndex++;

              if (this.currentWaypointIndex < this.waypoints.length) {
                // si hay mas waypoints, intentamos calcular la ruta nuevamente
                tryCalculateRoute();
              } else {
                console.log('Has llegado a tu destino.');
              }
              loading.dismiss();
            } else {
              console.log('Aún no has llegado al waypoint actual.', currentLeg);
              loading.dismiss();
              setTimeout(() => {
                tryCalculateRoute();
              }, 50000000);
            }
            loading.dismiss();
          }
        } else {
          console.warn('No se pudo calcular la ruta:', status);

          if (attempts < maxAttempts) {
            attempts++;
            console.log(`Intento ${attempts} de ${maxAttempts}`);
            setTimeout(() => {
              tryCalculateRoute();
            }, 1000);
          } else {
            alert('No se pudo calcular la ruta después de varios intentos.');
            loading.dismiss();
          }
        }
      });
    };
    tryCalculateRoute(); // llamamos la función recursiva para calcular la ruta
  }

  isCloseToWaypoint(currentLatLng: { lat: number, lng: number }, waypointLatLng: { lat: number, lng: number }): boolean {
    const proximidad = 50; // umbral de proximidad en metros

    // calculamos la distancia entre la ubicación actual y el waypoint
    const distance = google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(currentLatLng.lat, currentLatLng.lng),
      new google.maps.LatLng(waypointLatLng.lat, waypointLatLng.lng)
    );

    // verificamos si la distancia es menor que el umbral de proximidad
    return distance < proximidad;
  }


  // para actualizar la posición del marcador
  updateMarkerPosition(position: { lat: number, lng: number }) {
    if (this.marker) {
      this.marker.setPosition(position);
    } else {
      this.marker = new google.maps.Marker({
        position: position,
        map: this.map,
        title: 'Mi ubicación'
      });
    }
  }

  // para limpiar el marcador de la ubicación actual
  clearCurrentLocationMarker() {
    if (this.marker) {
      this.marker.setMap(null);
      this.marker = null;
    }
  }


  goBack() {
    // limpiar el marcador de la ubicación actual cuando se navega hacia atrás
    this.clearCurrentLocationMarker();
    this.nav.navigateBack('tabs/tab1');
  }
}
