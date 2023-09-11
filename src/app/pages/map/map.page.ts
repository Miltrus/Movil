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

  origin: google.maps.LatLng = new google.maps.LatLng(0, 0); /* 6.25534, -75.57484 */ // pa ponerla aca en el sena x si ocurren esos errores chimbos de la ubicacion
  destination: google.maps.LatLng = new google.maps.LatLng(6.29051, -75.57353);

  legs: any;
  currentLeg: any
  entregaButton = true

  waypoints: WayPointInterface[] = [
    { location: { lat: 0, lng: 0 }, stopover: true },
  ];

  paquete: any;
  uid = parseInt(localStorage.getItem('uid')!);
  isMyPaqsOpen = false;
  isDetailPaqOpen = false;
  paqueteSeleccionado: any;


  constructor(
    private loading: LoadingController,
    private alert: AlertController,
    private nav: NavController,
    private wayService: WaypointsService,
    private paqService: PaqueteService,
    private rastreoService: RastreoService,
  ) { }

  async ionViewDidEnter() {
    this.clearCurrentLocationMarker();
    await this.loadMap();
    this.waypoints = this.wayService.getWaypoints();
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
        timeout: 30000,
        maximumAge: 0
      };

      let attempts = 0;
      const maxAttempts = 30;

      const tryGetLocation = () => {
        this.locationWatchId = navigator.geolocation.watchPosition(
          async (position) => {
            const currentPositionLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

            this.origin = currentPositionLatLng;
            this.updateMarkerPosition(currentPositionLatLng);

            await loading.dismiss();
            await this.calculateRoute();
          },
          async (error) => {
            if (error.code == 1) {
              await loading.dismiss();
              this.presentAlert('Acceso a la ubicación requerido', 'Para continuar, por favor otorga permiso para acceder a tu ubicación.', 'OK');
              this.nav.navigateRoot('tabs/escaner');
              return;
            } else if (error.code == 2 || error.code == 3) {
              await loading.dismiss();
              this.presentAlert('Error al obtener la ubicación', 'No se pudo obtener la ubicación actual. Por favor, intenta nuevamente iniciar la ruta ;)', 'OK');
              this.nav.navigateRoot('tabs/escaner');
              return;
            }
            if (attempts <= maxAttempts) {
              attempts++;
              setTimeout(() => {
                tryGetLocation();
              }, 1000);
            } else {
              await loading.dismiss();
              this.presentAlert('Error al obtener la ubicación', 'No se pudo obtener la ubicación actual. Por favor, intenta nuevamente iniciar la ruta ;)', 'OK');
              this.nav.navigateRoot('tabs/escaner');
              return;
            }
          },
          geolocationOptions
        );
      };
      // llamamos la funcion recursiva pa obtener la ubi
      tryGetLocation();
    } else {
      this.presentAlert('Error al obtener la ubicación', 'Parece que tu dispositivo no soporta la geolocalización. Por favor, intenta nuevamente iniciar la ruta ;)', 'OK');
    }
  }

  async calculateRoute() {
    const loading = await this.loadingAlert('Calculando la ruta...');

    let attempts = 0;
    const maxAttempts = 30;

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

          const route = response.routes[0];
          this.legs = route.legs;
          this.currentLeg = this.legs[0];

          if (this.legs.length <= 1) {
            await loading.dismiss();
            const alert = await this.alert.create({
              header: 'Ruta finalizada',
              message: 'Si ha sido un error, cierra esta alerta e inicia la ruta nuevamente ;)',
              buttons: [{
                text: 'Cerrar',
                handler: () => {
                  this.nav.navigateRoot('tabs/escaner');
                }
              },
              {
                text: 'Finalizar',
                handler: async () => {
                  this.openGoogleMaps();
                  this.nav.navigateRoot('tabs/escaner');
                }
              }]
            });
            await alert.present();
            this.entregaButton = false
            return;
          }

          this.entregaButton = true
          await loading.dismiss();

        } else {
          if (attempts <= maxAttempts) {
            attempts++;
            setTimeout(() => {
              tryCalculateRoute();
            }, 1500);
          } else {
            await loading.dismiss();
            this.presentAlert('Error al calcular la ruta', 'No se pudo calcular la ruta correctamente. Por favor, intenta nuevamente iniciar la ruta ;)', 'OK');
            this.nav.navigateRoot('tabs/escaner');
            return;
          }
        }
      });
    };
    tryCalculateRoute(); // llamamos la funcion recursiva pa calcular la ruta
  }


  async deliverPaquete() {
    if (await this.isCloseToWaypoint(this.currentLeg)) {

      const currentWaypoint = await this.getCurrentWaypoint();
      const paqId = this.wayService.getPackageIdFromWaypoint(currentWaypoint);

      if (paqId !== null) {
        this.nav.navigateForward('/tabs/entrega', { queryParams: { paqId } });
      } else {
        this.presentAlert('Ups...', 'No se ha encontrado el paquete a entregar. No te preocupes, simplemente inicia nuevamente la ruta ;)', 'OK');
      }
    } else {
      this.presentAlert('¡Aún no llegas!', 'No estás cerca del siguiente punto de entrega.', 'OK');
    }
  }


  async isCloseToWaypoint(currentLeg: google.maps.DirectionsLeg): Promise<boolean> {
    const proximidad = 100; // umbral de proximidad en mts

    const remainingDistance = currentLeg.distance.value;

    const isClose = remainingDistance < proximidad;
    return isClose;
  }


  getCurrentWaypoint(): any {
    const way = this.currentLeg.end_location;
    const lat = parseFloat(way.lat());
    const lng = parseFloat(way.lng());

    const roundedLat = Math.round(lat * 100) / 100; // redondeo a 2 decimales pa errores de precision de google 🤐
    const roundedLng = Math.round(lng * 100) / 100;

    const convertedWaypoint = {
      location: {
        lat: roundedLat,
        lng: roundedLng
      },
      stopover: true
    };
    return convertedWaypoint;
  }

  openGoogleMaps() {
    let googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${this.origin.lat()},${this.origin.lng()}`;
    const nextWaypoint = this.legs[0].end_location;
    const nextWaypointString = `${nextWaypoint.lat()},${nextWaypoint.lng()}`;
    googleMapsUrl += `&destination=${nextWaypointString}`;

    window.open(googleMapsUrl, '_system');
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
          placeholder: '¿Qué ha pasado?',
        }
      ],
      backdropDismiss: false,
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
                backdropDismiss: false,
                buttons: [
                  'Cancelar',
                  {
                    text: 'Confirmar',
                    handler: async () => {
                      await confirmAlert.dismiss();
                      const loading = await this.loadingAlert('Guardando...');
                      try {
                        for (const paqueteItem of this.paquete) {
                          paqueteItem.idEstado = 4;

                          await this.paqService.putPaquete(paqueteItem).toPromise();

                          let getRastreo = await this.rastreoService.getRastreoByPaquete(paqueteItem.idPaquete).toPromise();

                          getRastreo!.idEstado = 2;
                          getRastreo!.motivoNoEntrega = desc.descripcion;
                          getRastreo!.fechaNoEntrega = this.formattedFechAct;

                          await this.rastreoService.putRastreo(getRastreo).toPromise();

                          this.wayService.removePackageIdWaypointAssociation(paqueteItem.idPaquete);
                        }
                        await loading.dismiss();
                        await this.presentAlert('Novedad reportada', 'La novedad se ha reportado exitosamente.', 'Aceptar');
                        this.wayService.setWaypoints([]);
                        this.nav.navigateRoot('tabs/escaner');
                      } catch (error) {
                        await loading.dismiss();
                        this.presentAlert('Error en el servidor', 'Ha ocurrido un error al reportar la novedad. Por favor, revisa tu conexión a internet o inténtalo nuevamente.', 'OK');
                        return;
                      }
                      await this.getPaqsByUser();
                    }
                  }
                ]
              });
              await confirmAlert.present();
            }
          }
        }
      ],
    });
    await descAlert.present();
  }

  openMyPaqs(isOpen: boolean) {
    this.isMyPaqsOpen = isOpen;
  }

  onModalMyPaqsDismiss(event: any) {
    this.isMyPaqsOpen = false;
  }

  detailPaq(isOpen: boolean, paquete: any) {
    this.isDetailPaqOpen = isOpen;
    this.paqueteSeleccionado = paquete;
  }

  onModalDetailPaqDismiss(event: any) {
    this.isDetailPaqOpen = false;
  }


  async getPaqsByUser() {
    this.paquete = await this.paqService.getPaqueteByUser(this.uid).toPromise();
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
