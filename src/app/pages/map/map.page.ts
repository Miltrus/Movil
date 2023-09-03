import { Component } from '@angular/core';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import { WayPointInterface } from 'src/app/models/waypoint.interface';
import { PaqueteService } from 'src/app/services/api/paquete.service';
import { RastreoService } from 'src/app/services/api/rastreo.service';
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
  formattedFechAct: any
  indicators: any;
  directionsService = new google.maps.DirectionsService();  // pa calcular la ruta
  directionsDisplay = new google.maps.DirectionsRenderer(); // pa mostrar la ruta
  marker: google.maps.Marker | null = null; // para el marcador de la ubicación actual
  locationWatchId: number | null = null; // para almacenar el id de la suscripción de watchPosition
  currentWaypointIndex: any = 0;

  origin: google.maps.LatLng = new google.maps.LatLng(0, 0);
  destination: google.maps.LatLng = new google.maps.LatLng(6.29051, -75.57353);

  entregaButton: boolean = false;
  legs: any;

  waypoints: WayPointInterface[] = [
    { location: { lat: 6.29747, lng: -75.55033 }, stopover: true },
  ];

  paquete: any;
  uid = parseInt(localStorage.getItem('uid')!);
  isMyPaqsOpen = false;
  isDetailPaq = false;
  paqueteSeleccionado: any;


  constructor(
    private loading: LoadingController,
    private alert: AlertController,
    private nav: NavController,
    private waypointService: WaypointsService,
    private paqService: PaqueteService,
    private rastreoService: RastreoService,
  ) { }

  async ionViewDidEnter() {
    this.waypoints = this.waypointService.getWaypoints();
    console.log("nuevos way:", this.waypoints)
    this.clearCurrentLocationMarker();
    await this.loadMap();
    await this.getPaqsByUser();
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
    });
  }

  async getCurrentLocation() {
    const loading = await this.loadingAlert('Obteniendo tu ubicación...');
    if (navigator.geolocation) {
      const geolocationOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      };

      let attempts = 0;
      const maxAttempts = 60;

      const tryGetLocation = () => {
        this.locationWatchId = navigator.geolocation.watchPosition(
          async (position) => {
            const currentLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

            this.origin = currentLatLng;
            this.updateMarkerPosition(currentLatLng);

            console.log("Nueva ubicación:", currentLatLng.lat(), currentLatLng.lng());
            await loading.dismiss();
            this.calculateRoute();
          },
          async (error) => {
            console.log('Error al obtener la ubicación:', error);
            if (error.code == 1) {
              await loading.dismiss();
              this.presentAlert('Acceso a la ubicación requerido', 'Para continuar, por favor otorga permiso para acceder a tu ubicación.', 'OK');
              this.nav.navigateBack('tabs/escaner');
              return;
            } else if (error.code == 2 || error.code == 3) {
              await loading.dismiss();
              this.presentAlert('Error al obtener la ubicación', 'No se pudo obtener la ubicación actual. Por favor, revisa tu conexión o inténtalo nuevamente', 'OK');
              this.nav.navigateBack('tabs/escaner');
              return;
            }
            if (attempts < maxAttempts) {
              attempts++;
              setTimeout(() => {
                tryGetLocation();
              }, 1000);
            } else {
              await loading.dismiss();
              this.presentAlert('Error al obtener la ubicación', 'No se pudo obtener la ubicación actual. Por favor, revisa tu conexión o inténtalo nuevamente', 'OK');
              this.nav.navigateBack('tabs/escaner');
              return;
            }
          },
          geolocationOptions
        );
      };
      // llamamos la funcion recursiva pa obtener la ubi
      tryGetLocation();
    } else {
      alert('El navegador no admite la geolocalización.');
    }
  }

  async calculateRoute() {
    console.log('ME LLAMARONN');
    const loading = await this.loadingAlert('Calculando la ruta...');

    let attempts = 0;
    const maxAttempts = 15;

    const tryCalculateRoute = () => {
      this.directionsService.route({
        origin: this.origin,
        destination: this.destination,
        waypoints: this.waypoints,
        optimizeWaypoints: true,
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC
      }, async (response: any, status: any) => {
        if (status === google.maps.DirectionsStatus.OK) {
          this.directionsDisplay.setDirections(response);

          // verificar si se ha llegado a un waypoint
          const route = response.routes[0];
          console.log('routeEEEEEE:', route);
          this.legs = route.legs;
          console.log('legs:', this.legs);
          const currentLeg = this.legs[this.currentWaypointIndex];

          if (await this.isCloseToWaypoint(currentLeg)) {
            console.log(`Llegaste al waypoint ${this.currentWaypointIndex + 1}`, currentLeg);
            this.currentWaypointIndex++;
            this.entregaButton = true;

            if (this.currentWaypointIndex < this.waypoints.length) {
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
            }, 10000);
          }
        } else {
          if (attempts < maxAttempts) {
            attempts++;
            setTimeout(() => {
              tryCalculateRoute();
            }, 2000);
          } else {
            await loading.dismiss();
            this.presentAlert('Error al calcular la ruta', 'No se pudo calcular la ruta correctamente. Por favor, revisa tu conexión o inténtalo nuevamente', 'OK');
            this.nav.navigateBack('tabs/escaner');
            return;
          }
        }
      });
    };
    tryCalculateRoute(); // llamamos la funcion recursiva pa calcular la ruta
  }


  async isCloseToWaypoint(currentLeg: google.maps.DirectionsLeg): Promise<boolean> {
    const proximidad = 2000; // umbral de proximidad en mts

    const remainingDistance = currentLeg.distance.value;
    console.log('Distancia restante al waypoint:', remainingDistance);

    const isClose = remainingDistance < proximidad;
    console.log('¿Estás cerca del waypoint?', isClose);
    return isClose;
  }


  openGoogleMaps() {
    let googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${this.origin.lat()},${this.origin.lng()}`;
    console.log('PRIMERA:', this.currentWaypointIndex);
    console.log('SEGUNDA:', this.waypoints.length);
    if (this.currentWaypointIndex < this.waypoints.length) {
      const nextWaypoint = this.legs[this.currentWaypointIndex - 1].end_location;
      const nextWaypointString = `${nextWaypoint.lat()},${nextWaypoint.lng()}`;
      googleMapsUrl += `&destination=${nextWaypointString}`;
    } else {
      const finalDestinationString = `${this.destination.lat()},${this.destination.lng()}`;
      googleMapsUrl += `&destination=${finalDestinationString}`;
    }

    window.open(googleMapsUrl, '_system');
  }


  deliverPaquete() {
    const currentWaypoint = this.getCurrentWaypoint();
    const paqId = this.waypointService.getPackageIdFromWaypoint(currentWaypoint);

    if (paqId !== null) {
      this.nav.navigateForward('/tabs/entrega', { queryParams: { paqId } });
    } else {
      this.presentAlert('Error', 'No se ha encontrado el paquete a entregar. Por favor, inténtalo nuevamente.', 'OK');
    }
  }

  getCurrentWaypoint(): any {
    const way = this.legs[this.currentWaypointIndex - 1].end_location;
    const lat = parseFloat(way.lat());
    const lng = parseFloat(way.lng());

    const roundedLat = Math.round(lat * 1000) / 1000;
    const roundedLng = Math.round(lng * 1000) / 1000;

    const convertedWaypoint = {
      location: {
        lat: roundedLat,
        lng: roundedLng
      },
      stopover: true
    };

    console.log('convertedWaypoint:', convertedWaypoint);
    return convertedWaypoint;
  }


  getFechAct() {
    const fechaActual = new Date();
    this.formattedFechAct = `${fechaActual.getFullYear()}-${(fechaActual.getMonth() + 1)
      .toString().padStart(2, '0')}-${fechaActual.getDate().toString().padStart(2, '0')} ${fechaActual.getHours().toString()
        .padStart(2, '0')}:${fechaActual.getMinutes().toString().padStart(2, '0')}:${fechaActual.getSeconds().toString().padStart(2, '0')}`;

    return this.formattedFechAct
  }


  async reportNovedad() {
    const descAlert = await this.alert.create({
      header: 'Detalles adicionales',
      inputs: [
        {
          name: 'descripcion',
          type: 'textarea',
          placeholder: '¿Qué ha pasado?'
        }
      ],
      buttons: [
        'Cancelar',
        {
          text: 'Reportar',
          handler: async (desc: any) => {
            if (!desc.descripcion) {
              this.presentAlert('Error', 'Debes ingresar una descripción de la novedad.', 'OK');
            } else {
              await this.getFechAct();
              await descAlert.dismiss();
              const confirmAlert = await this.alert.create({
                header: 'Confirmar reporte',
                message: 'Una vez confirmado, no podrá ser modificado o eliminado y los paquetes que no hayan sido entregados en esta ruta deberán volver a bodega y la ruta se finalizará',
                buttons: [
                  {
                    text: 'Cancelar',
                    role: 'cancel'
                  },
                  {
                    text: 'Confirmar',
                    handler: async () => {
                      await confirmAlert.dismiss();
                      const loading = await this.loadingAlert('Guardando...');
                      await this.getPaqsByUser();
                      try {
                        console.log('paquetes:', this.paquete);
                        for (const paqueteItem of this.paquete) {
                          paqueteItem.idEstado = 4;

                          await this.paqService.putPaquete(paqueteItem).toPromise();

                          let getRastreo = await this.rastreoService.getRastreoByPaquete(paqueteItem.idPaquete).toPromise();

                          getRastreo!.idEstado = 2;
                          getRastreo!.motivoNoEntrega = desc.descripcion;
                          getRastreo!.fechaNoEntrega = this.formattedFechAct;

                          await this.rastreoService.putRastreo(getRastreo).toPromise();

                        }
                        await loading.dismiss();
                        await this.presentAlert('Novedad reportada', 'La novedad se ha reportado exitosamente.', 'Aceptar');
                      } catch (error) {
                        await loading.dismiss();
                        this.presentAlert('Error en el servidor', 'Ha ocurrido un error al reportar la novedad. Por favor, revisa tu conexión a internet o inténtalo nuevamente.', 'OK');
                        return;
                      }
                    }
                  }
                ]
              });
              await confirmAlert.present();
            }
          }
        }
      ]
    });
    await descAlert.present();
  }

  openMyPaqs(isOpen: boolean) {
    this.isMyPaqsOpen = isOpen;
  }

  detailPaq(isOpen: boolean, paquete: any) {
    this.isDetailPaq = isOpen;
    this.paqueteSeleccionado = paquete;
  }


  async getPaqsByUser() {
    try {
      this.paquete = await this.paqService.getPaqueteByUser(this.uid).toPromise();
    } catch (error) {
      console.error('Error al obtener paquetes:', error);
    }
    console.log('paquetes:', this.paquete);
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

  async presentAlert(title: string, msg: string, btn: string) {
    const alert = await this.alert.create({
      header: title,
      message: msg,
      buttons: [btn]
    });
    await alert.present();
  }

  async loadingAlert(msg: string) {
    const loading = await this.loading.create({
      message: msg,
      spinner: 'lines',
    });
    await loading.present();
    return loading;
  }
}
