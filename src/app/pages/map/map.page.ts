import { Component } from '@angular/core';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import { WayPointInterface } from 'src/app/models/waypoint.interface';
import { WaypointsService } from 'src/app/services/waypoints.service';

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
  currentWaypointIndex: any = 0;

  origin: { lat: number, lng: number } = { lat: 0, lng: 0 };
  destination = { lat: 6.26732, lng: -75.59406 };

  entregaButton: boolean = false;

  waypoints: WayPointInterface[] = [
    { location: { lat: 6.29747, lng: -75.55033 }, stopover: true },
  ];

  constructor(
    private loading: LoadingController,
    private alert: AlertController,
    private nav: NavController,
    private waypointService: WaypointsService,
  ) { }

  ionViewDidEnter() {
    this.waypoints = this.waypointService.getWaypoints();
    console.log("nuevos way:", this.waypoints)
    this.clearCurrentLocationMarker();
    this.loadMap();
  }

  ionViewWillLeave() {
    // cancelar la suscripción de watchPosition al salir de la página
    if (this.locationWatchId !== null) {
      navigator.geolocation.clearWatch(this.locationWatchId);
    }
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
      const maxAttempts = 15;

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
      message: 'Calculando la ruta...',
      spinner: 'lines',
    });
    await loading.present();

    let attempts = 0;
    const maxAttempts = 10;

    // funcion recursiva para intentar calcular la ruta
    const tryCalculateRoute = () => {

      this.directionsService.route({
        origin: this.origin,
        destination: this.origin,
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
          console.log("this.waypoints:", this.waypoints); // Verifica que this.waypoints tenga valores
          console.log("currentWaypointIndex:", this.currentWaypointIndex); // Verifica el valor de this.currentWaypointIndex
          console.log("location:", this.waypoints[this.currentWaypointIndex]?.location); // Verifica la propiedad location en el objeto de waypoint

          const waypointLatLng = this.waypoints[this.currentWaypointIndex].location;
          console.log("waypointLatLng:", waypointLatLng); // Verifica que waypointLatLng tenga un valor

          if (this.isCloseToWaypoint(this.origin, waypointLatLng)) {
            console.log(`Llegaste al waypoint ${this.currentWaypointIndex}`, currentLeg);
            this.currentWaypointIndex++;
            this.entregaButton = true;

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

        } else {
          console.warn('No se pudo calcular la ruta:', status);

          if (attempts < maxAttempts) {
            attempts++;
            console.log(`Intento ${attempts} de ${maxAttempts}`);
            setTimeout(() => {
              tryCalculateRoute();
            }, 2000);
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
    const proximidad = 20000; // umbral de proximidad en metros

    // calculamos la distancia entre la ubicación actual y el waypoint
    const distance = google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(currentLatLng.lat, currentLatLng.lng),
      new google.maps.LatLng(waypointLatLng.lat, waypointLatLng.lng)
    );

    // verificamos si la distancia es menor que el umbral de proximidad
    return distance < proximidad;
  }

  openGoogleMaps() {
    let googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${this.origin.lat},${this.origin.lng}&destination=${this.origin.lat},${this.origin.lng}`;

    if (this.waypoints.length > 0) {
      const waypointsString = this.waypoints
        .map(waypoint => `${waypoint.location.lat},${waypoint.location.lng}`)
        .join('|');
      googleMapsUrl += `&waypoints=${waypointsString}`;
    }

    window.open(googleMapsUrl, '_system');
  }


  // ESTO NO SIRVE ARREGLARLO
  deliverPaquete() {
    const currentWaypoint = this.getCurrentWaypoint();
    const paqId = this.waypointService.getPackageIdFromWaypoint(currentWaypoint);

    if (paqId !== null) {
      console.log("Paquete a entregar:", paqId, currentWaypoint);
      this.entregaButton = false;

      // Pasar el ID del paquete como query parameter en la URL al navegar
      this.nav.navigateForward('/tabs/entrega', { queryParams: { paqId } });
    } else {
      console.log("No se encontró el paquete asociado al waypoint.");
    }
  }

  getCurrentWaypoint(): any {
    return this.waypoints[this.currentWaypointIndex - 1];
  }


  tipoNovedad: any[] = [];

  async reportNovedad() {
    const loading = await this.loading.create({
      message: 'Cargando...',
      spinner: 'lines',
    });
    await loading.present();
    /* this.novService.getTipoNovedad().subscribe(
      data => {
        this.tipoNovedad = data;
      },
      error => {
        console.log(error);
        this.alert.create({
          header: 'Error en el servidor',
          message: 'No se pudo cargar el tipo de novedad. Por favor, revisa tu conexión a internet o inténtalo nuevamente',
          buttons: ['OK']
        }).then(alert => alert.present());
      }
    ); */
    await loading.dismiss();

    const tipoNovedadAlert = await this.alert.create({
      header: 'Tipo novedad',
      inputs: this.tipoNovedad.map((tipo: any) => ({
        type: 'radio',
        label: tipo.tipoNovedad,
        value: tipo.idTipoNovedad,
        checked: false
      })),
      buttons: [
        'Cancelar',
        {
          text: 'Siguiente',
          handler: tipoNovedadId => {
            if (!tipoNovedadId) {
              this.alert.create({
                header: 'Error',
                message: 'Debes seleccionar un tipo de novedad.',
                buttons: ['OK']
              }).then(alert => alert.present());
              return
            }
            this.mostrarDescripcionAlert(tipoNovedadId);
            console.log('seleccion:', tipoNovedadId);
          }
        }
      ]
    });

    await tipoNovedadAlert.present();
  }

  async mostrarDescripcionAlert(tipoNovedad: any) {
    const descripcionAlert = await this.alert.create({
      header: 'Detalles novedad',
      inputs: [
        {
          name: 'descripcion',
          type: 'textarea',
          placeholder: 'Detalles adicionales...'
        }
      ],
      buttons: [
        'Cancelar',
        {
          text: 'Reportar',
          handler: (data: any) => {
            const descripcion = data.descripcion;
            console.log('Idtipo:', tipoNovedad);
            console.log('desc:', descripcion);
          }
        }
      ]
    });

    await descripcionAlert.present();
  }

  getTipoNovedadById(idTipoNovedad: any) {
    return this.tipoNovedad.find(tipo => tipo.id === idTipoNovedad);
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
    this.nav.navigateBack('tabs/escaner');
  }
}
