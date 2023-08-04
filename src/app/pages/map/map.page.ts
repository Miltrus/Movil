import { Component, OnInit } from '@angular/core';
import { LoadingController, NavController } from '@ionic/angular';
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
  mapEle: any;
  indicators: any;
  directionsService = new google.maps.DirectionsService();  // Para calcular la ruta
  directionsDisplay = new google.maps.DirectionsRenderer(); // Para mostrar la ruta
  marker: google.maps.Marker | null = null; // Para el marcador de la ubicación actual

  origin: { lat: number, lng: number } = { lat: 0, lng: 0 }; // Propiedad para almacenar la ubicación actual
  destination = { lat: 6.2975878, lng: -75.5586858 };

  waypoints: WayPointInterface[] = [
    { location: { lat: 6.16330, lng: -75.63106 }, stopover: true },
    { location: { lat: 6.20860, lng: -75.56431 }, stopover: true },
    { location: { lat: 6.29774, lng: -75.55036 }, stopover: true },
    { location: { lat: 6.33401, lng: -75.55695 }, stopover: true },
  ];

  constructor(
    private loading: LoadingController,
    private nav: NavController,
  ) { }

  ngOnInit() {
    this.loadMap();
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
      await this.getCurrentLocation(); // Llamamos a getCurrentLocation() solo al cargar el mapa
      this.calculateRoute(); // Llamamos a calculateRoute() solo al cargar el mapa
    });
  }

  async getCurrentLocation() {
    if (navigator.geolocation) {
      const geolocationOptions = {
        enableHighAccuracy: true, // Habilitar la máxima precisión posible
        timeout: 10000, // Tiempo máximo para esperar la respuesta
        maximumAge: 0 // No usar la caché de la ubicación anterior
      };

      let attempts = 0;
      const maxAttempts = 10;

      // Función recursiva para intentar obtener la ubicación
      const tryGetLocation = () => {
        navigator.geolocation.watchPosition(
          (position) => {
            const currentLatLng = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            this.origin = currentLatLng;
            this.updateMarkerPosition(currentLatLng);

            // Agregamos el mensaje de consola para verificar la actualización de la ubicación
            console.log("Nueva ubicación:", currentLatLng);
          },
          (error) => {
            console.error('Error al obtener la ubicación actual:', error);
            if (attempts < maxAttempts) {
              attempts++;
              console.log(`Intento ${attempts} de ${maxAttempts}`);
              // Intentamos obtener la ubicación nuevamente después de 1 segundo (1000 ms)
              setTimeout(() => {
                tryGetLocation();
              }, 1000);
            } else {
              alert('No se pudo obtener la ubicación actual después de varios intentos.');
            }
          },
          geolocationOptions // Pasamos las opciones para la geolocalización
        );
      };

      // Iniciamos la función recursiva para obtener la ubicación
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

    // Función recursiva para intentar calcular la ruta
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
          loading.dismiss();
        } else {
          console.warn('No se pudo calcular la ruta:', status);
          if (attempts < maxAttempts) {
            attempts++;
            console.log(`Intento ${attempts} de ${maxAttempts}`);
            // intentamos calcular la ruta nuevamente después de 1 segundo
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

    tryCalculateRoute(); // Iniciamos la función recursiva para calcular la ruta
  }

  // Función para actualizar la posición del marcador
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

  goBack() {
    this.nav.navigateBack('tabs/tab1');
  }

  /* addMarker(marker: MarkerInterface) {
    return new google.maps.Marker({
      position: { lat: 6.25184, lng: -75.56359 },
      map: this.map,
      title: marker.title
    });
  } */
}
