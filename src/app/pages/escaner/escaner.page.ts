import { Component, OnDestroy } from '@angular/core';
import { BarcodeScanner, TorchStateResult } from '@capacitor-community/barcode-scanner';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import { WayPointInterface } from 'src/app/models/waypoint.interface';
import { PaqueteService } from 'src/app/services/api/paquete.service';
import { RastreoService } from 'src/app/services/api/rastreo.service';
import { WaypointsService } from 'src/app/services/waypoints.service';

@Component({
  selector: 'app-escaner',
  templateUrl: 'escaner.page.html',
  styleUrls: ['escaner.page.scss']
})
export class EscanerPage implements OnDestroy {

  scannedResults: any[] = [];
  contentVisibility = true;
  isFlashlightOn = false;
  isHelpOpen = false;

  packageId: any;

  uid = parseInt(localStorage.getItem('uid')!);

  constructor(
    private alert: AlertController,
    private loading: LoadingController,
    private nav: NavController,
    private api: PaqueteService,
    private rastreo: RastreoService,
    private wayService: WaypointsService
  ) { }


  async ionViewDidEnter(refresher?: any) {
    const loading = await this.loadingAlert('Cargando...');
    this.api.getPaqueteByUser(this.uid).subscribe(async (data: any) => {
      this.scannedResults = [];

      if (data.length >= 1) {
        for (const item of data) {
          const scannedPackage = {
            id: item.idPaquete,
            cod: item.codigoPaquete,
            lat: item.lat,
            lng: item.lng
          };
          this.scannedResults.push([scannedPackage]);
        }
      }
      await loading.dismiss();
      if (refresher) {
        refresher.complete();
      }
    },
      async (error) => {
        await loading.dismiss();
        this.presentAlert('Error en el servidor', 'Ha ocurrido un error al comunicarse con el servidor. Por favor, revisa tu conexión a internet o inténtalo nuevamente');
        if (refresher) {
          refresher.complete();
        }
      });
  }

  generateWaypointsFromScannedResults(): any {
    const waypointsWithoutRounding: WayPointInterface[] = [];

    for (const i of this.scannedResults) {
      this.packageId = i[0].id;
      const latRound = parseFloat(i[0].lat);
      const lngRound = parseFloat(i[0].lng);
      const roundedLat = Math.round(latRound * 100) / 100; // redondeo a 2 decimales pa errores de precision de google 🤐
      const roundedLng = Math.round(lngRound * 100) / 100;

      const latLng = { lat: roundedLat, lng: roundedLng };
      const waypointsRound: WayPointInterface = { location: latLng, stopover: true };

      this.wayService.associatePackageWithWaypoint(this.packageId, waypointsRound);

      const latLngWithoutRounding = { lat: i[0].lat, lng: i[0].lng };
      const waypointWithoutRounding: WayPointInterface = { location: latLngWithoutRounding, stopover: true };
      waypointsWithoutRounding.push(waypointWithoutRounding);
    }

    this.wayService.setWaypoints(waypointsWithoutRounding);
  }



  async startRoute() {
    const alert = await this.alert.create({
      header: 'Confirmar',
      message: '¿Estás seguro de que deseas iniciar la ruta?',
      buttons: [
        'Cancelar',
        {
          text: 'Confirmar',
          handler: async () => {
            await alert.dismiss();
            const loading = await this.loadingAlert('Cargando...');
            try {
              for (const i of this.scannedResults) {
                for (const j of i) {
                  const rastreo = {
                    idPaquete: j.id,
                    idUsuario: this.uid,
                  };

                  try {
                    await this.rastreo.deleteRastreo(rastreo).toPromise();
                    await this.rastreo.postRastreo(rastreo).toPromise();
                  } catch (error) {
                    this.presentAlert('Error en el servidor', 'Ha ocurrido un error al comunicarse con el servidor. Por favor, revisa tu conexión a internet o inténtalo nuevamente');
                  }
                }
              }

              this.generateWaypointsFromScannedResults();
              this.nav.navigateForward('/tabs/mapa');
              await loading.dismiss();
            } catch (error) {
              await loading.dismiss();
              this.presentAlert('Error en el servidor', 'Ha ocurrido un error al comunicarse con el servidor. Por favor, revisa tu conexión a internet o inténtalo nuevamente');
            }
          }
        }]
    });
    await alert.present();
  }


  async checkPermission() {
    try {
      const status = await BarcodeScanner.checkPermission({ force: true });
      if (status.granted) {
        return true;
      } else if (status.denied) {
        const alert = await this.alert.create({
          header: 'Permiso requerido',
          message: 'No se ha otorgado el permiso para acceder a la cámara. Por favor, otorgalo a continuación.',
          buttons: [
            'Cancelar',
            {
              text: 'Configuración',
              handler: () => {
                BarcodeScanner.openAppSettings();
              }
            }
          ]
        });
        await alert.present();
      }
      return false;
    } catch (err) {
      return false;
    }
  }


  async scanQR() {
    this.isFlashlightOn = false
    try {
      const permission = await this.checkPermission();
      if (!permission) {
        return;
      }

      await BarcodeScanner.hideBackground();
      document.querySelector('body')!.classList.add('scanner-active');
      this.contentVisibility = false;

      const result = await BarcodeScanner.startScan();
      this.contentVisibility = true;
      BarcodeScanner.showBackground();
      document.querySelector('body')!.classList.remove('scanner-active');

      if (result.hasContent) {
        try {
          const qrDataArray: any[] = JSON.parse(result.content);
          if (qrDataArray.every((item) =>
            Object.keys(item).length == 4 &&
            item.hasOwnProperty("id") &&
            item.hasOwnProperty("cod") &&
            item.hasOwnProperty("lat") &&
            item.hasOwnProperty("lng")
          )) {
            const qrData = qrDataArray[0].cod;

            const codExists = this.scannedResults.find((i: any) =>
              i.some((item: any) => item.cod == qrData)
            );

            if (codExists) {
              this.presentAlert('Paquete duplicado', 'Ya has ingresado este paquete a tu lista.');
            } else {
              const loading = await this.loadingAlert('Cargando...');

              this.api.getPaqueteByCodigo(qrDataArray[0].cod).subscribe(
                async (data: any) => {
                  if (data.status != 'error') {

                    if (data.idEstado == 3) {
                      await loading.dismiss();
                      this.presentAlert('Paquete ya entregado', 'Este paquete ya ha sido entregado.');
                      return;
                    }
                    if (data.idUsuario != this.uid && data.idEstado == 2) {
                      await loading.dismiss();
                      const alert = await this.alert.create({
                        header: 'Paquete asignado a otro mensajero',
                        message: 'Este paquete ya ha sido escaneado por otro repartidor. ¿Estás seguro de que deseas continuar?',
                        buttons: [
                          'Cancelar',
                          {
                            text: 'Continuar',
                            handler: async () => {
                              const confirmAlert = await this.alert.create({
                                header: 'Confirmar',
                                message: `¿Estás seguro de que deseas agregar el paquete '${data.codigoPaquete}' a tu lista?`,
                                buttons: [
                                  'Cancelar',
                                  {
                                    text: 'Confirmar',
                                    handler: async () => {
                                      data.idUsuario = this.uid;
                                      data.idEstado = 2;
                                      this.api.putPaquete(data).subscribe(
                                        async (res: any) => {
                                          this.scannedResults.push(qrDataArray);
                                          await loading.dismiss();
                                        },
                                        async (error) => {
                                          await loading.dismiss();
                                          this.presentAlert('Error en el servidor', 'Ha ocurrido un error al comunicarse con el servidor. Por favor, revisa tu conexión a internet o inténtalo nuevamente');
                                        }
                                      );
                                    }
                                  }
                                ]
                              });
                              await confirmAlert.present();
                            }
                          }]
                      });
                      await alert.present();
                    } else {
                      data.idUsuario = this.uid;
                      data.idEstado = 2;
                      this.api.putPaquete(data).subscribe(
                        async (res: any) => {
                          this.scannedResults.push(qrDataArray);
                          await loading.dismiss();
                        },
                        async (error) => {
                          await loading.dismiss();
                          this.presentAlert('Error en el servidor', 'Ha ocurrido un error al comunicarse con el servidor. Por favor, revisa tu conexión a internet o inténtalo nuevamente');
                        }
                      );
                    }
                  } else {
                    await loading.dismiss();
                    this.presentAlert('Error', 'El QR escaneado no es válido. Por favor, escanea un QR válido o ingresa el código manualmente.');
                  }
                },
                async (error) => {
                  await loading.dismiss();
                  this.presentAlert('Error en el servidor', 'Ha ocurrido un error al comunicarse con el servidor. Por favor, revisa tu conexión a internet o inténtalo nuevamente');
                }
              );
            }
          } else {
            this.presentAlert('Error', 'El QR escaneado no es válido. Por favor, escanea un QR válido o introduzca el código manualmente.');
          }
        } catch (error) {
          this.presentAlert('Error', 'El QR escaneado no es válido. Por favor, escanea un QR válido o introduzca el código manualmente.');
        }
      }
    } catch (error) {
      this.stopScan();
    }
  }


  async enterCodeManually() {
    const alertInput = await this.alert.create({
      header: 'Introducir código manualmente',
      inputs: [
        {
          name: 'manualCode',
          type: 'text',
          placeholder: 'Ingresa el código del paquete aquí'
        }
      ],
      buttons: [
        'Cancelar',
        {
          text: 'Confirmar',
          handler: async (data) => {
            if (data.manualCode) {
              const loading = await this.loadingAlert('Validando...');
              if (this.scannedResults.find((i: any) =>
                i.some((item: any) => item.cod === data.manualCode.toUpperCase()))) {
                await alertInput.dismiss();
                await loading.dismiss();
                this.presentAlert('Paquete duplicado', 'Ya has ingresado este paquete a tu lista.');
              } else {
                this.api.getPaqueteByCodigo(data.manualCode).subscribe(
                  async (res: any) => {
                    if (res.status == 'error') {
                      await loading.dismiss();
                      this.presentAlert('Error', 'El código ingresado no es válido. Por favor, ingresa un código válido o escanea el QR.');
                    } else {

                      if (res.idEstado == 3) {
                        await loading.dismiss();
                        this.presentAlert('Paquete ya entregado', 'Este paquete ya ha sido entregado.');
                        return;
                      }
                      if (res.idUsuario != this.uid && res.idEstado == 2) {
                        await loading.dismiss();
                        const alert = await this.alert.create({
                          header: 'Paquete asignado a otro mensajero',
                          message: 'Este paquete ya ha sido escaneado por otro repartidor. ¿Estás seguro de que deseas continuar?',
                          buttons: [
                            'Cancelar',
                            {
                              text: 'Continuar',
                              handler: async () => {
                                const confirmAlert = await this.alert.create({
                                  header: 'Confirmar',
                                  message: `¿Estás seguro de que deseas agregar el paquete '${res.codigoPaquete}' a tu lista?`,
                                  buttons: [
                                    'Cancelar',
                                    {
                                      text: 'Confirmar',
                                      handler: async () => {
                                        res.idUsuario = this.uid;
                                        res.idEstado = 2;
                                        this.api.putPaquete(res).subscribe(
                                          async (data: any) => {
                                            const scannedPackage = {
                                              id: res.idPaquete,
                                              cod: res.codigoPaquete,
                                              lat: res.lat,
                                              lng: res.lng
                                            };
                                            this.scannedResults.push([scannedPackage]);
                                            await loading.dismiss();
                                          },
                                          async (error) => {
                                            await loading.dismiss();
                                            this.presentAlert('Error en el servidor', 'Ha ocurrido un error al comunicarse con el servidor. Por favor, revisa tu conexión a internet o inténtalo nuevamente');
                                          }
                                        );
                                      }
                                    }
                                  ]
                                });
                                await confirmAlert.present();
                              }
                            }]
                        });
                        await alert.present();
                      } else {
                        res.idUsuario = this.uid;
                        res.idEstado = 2;
                        this.api.putPaquete(res).subscribe(
                          async (data: any) => {
                            const scannedPackage = {
                              id: res.idPaquete,
                              cod: res.codigoPaquete,
                              lat: res.lat,
                              lng: res.lng
                            };
                            this.scannedResults.push([scannedPackage]);
                            await loading.dismiss();
                          },
                          async (error) => {
                            await loading.dismiss();
                            this.presentAlert('Error en el servidor', 'Ha ocurrido un error al comunicarse con el servidor. Por favor, revisa tu conexión a internet o inténtalo nuevamente');
                          }
                        );
                      }
                    }
                  },
                  async (error) => {
                    await loading.dismiss();
                    this.presentAlert('Error en el servidor', 'Ha ocurrido un error al validar el código. Por favor, revisa tu conexión a internet o inténtalo nuevamente');
                  }
                );
              }
            } else {
              await alertInput.dismiss();
              this.presentAlert('Error', 'No se ha ingresado ningún código. Por favor, ingresa un código válido o escanea el QR.');
            }
          }
        }
      ]
    });
    await alertInput.present();
  }


  async removePaquete(index: number) {
    const paqueteToRemove = this.scannedResults[index];
    const alert = await this.alert.create({
      header: 'Confirmar',
      message: `¿Estás seguro de que deseas eliminar el paquete '${paqueteToRemove[0].cod}' de tu lista?`,
      buttons: [
        'Cancelar',
        {
          text: 'Confirmar',
          handler: async () => {
            await alert.dismiss();
            const loading = await this.loadingAlert('Cargando...');

            const paqToUpdate = {
              idPaquete: paqueteToRemove[0].id,
              idUsuario: null,
              idEstado: 1
            }

            this.api.putPaquete(paqToUpdate).subscribe(
              async (data: any) => {
                this.scannedResults.splice(index, 1);
                await loading.dismiss();
              },
              async (error) => {
                await loading.dismiss();
                this.presentAlert('Error en el servidor', 'Ha ocurrido un error al comunicarse con el servidor. Por favor, revisa tu conexión a internet o inténtalo nuevamente');
              }
            );
          }
        }
      ]
    });
    await alert.present();
  }


  async stopScan() {
    this.contentVisibility = true;
    BarcodeScanner.showBackground();
    await BarcodeScanner.stopScan();
    document.querySelector('body')!.classList.remove('scanner-active');
  }

  async toggleFlashlight() {
    const torchState: TorchStateResult = await BarcodeScanner.getTorchState();

    if (torchState.isEnabled) {
      await BarcodeScanner.disableTorch();
      this.isFlashlightOn = false;
    } else {
      await BarcodeScanner.enableTorch();
      this.isFlashlightOn = true;
    }

  }

  ngOnDestroy() {
    this.stopScan();
  }

  openHelp(isOpen: boolean) {
    this.isHelpOpen = isOpen;
  }

  onModalDismiss(event: any) {
    this.isHelpOpen = false;
  }

  async presentAlert(title: string, msg: string) {
    const alert = await this.alert.create({
      header: title,
      message: msg,
      buttons: ['OK']
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