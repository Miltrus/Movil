import { Component, OnDestroy, OnInit } from '@angular/core';
import { BarcodeScanner, TorchStateResult } from '@capacitor-community/barcode-scanner';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import { WayPointInterface } from 'src/app/models/waypoint.interface';
import { PaqueteService } from 'src/app/services/api/paquete.service';
import { WaypointsService } from 'src/app/services/waypoints.service';

@Component({
  selector: 'app-escaner',
  templateUrl: 'escaner.page.html',
  styleUrls: ['escaner.page.scss']
})
export class EscanerPage implements OnInit, OnDestroy {

  scannedResults: any = [];
  contentVisibility = true;
  isFlashlightOn = false;
  isHelpOpen = false;

  uid = localStorage.getItem('uid');

  constructor(
    private alert: AlertController,
    private api: PaqueteService,
    private loading: LoadingController,
    private nav: NavController,
    private waypointService: WaypointsService
  ) { }


  ngOnInit(): void {
    const scannedLocalResults = localStorage.getItem(`scannedResults_${this.uid}`);
    if (scannedLocalResults) {
      this.scannedResults = JSON.parse(scannedLocalResults);
    } else {
      this.scannedResults = [];
    }
  }

  generateWaypointsFromScannedResults(): WayPointInterface[] {
    const waypoints: WayPointInterface[] = [];

    for (const i of this.scannedResults) {
      const packageId = i[0].id;
      const latLng = { lat: i[0].lat, lng: i[0].lng };
      const waypoint: WayPointInterface = { location: latLng, stopover: true };

      waypoints.push(waypoint);
      this.waypointService.associatePackageWithWaypoint(packageId, waypoint);
    }

    return waypoints;
  }


  async startRoute() {
    const waypoints = this.generateWaypointsFromScannedResults();
    await this.waypointService.setWaypoints(waypoints);
    this.nav.navigateForward('/tabs/mapa');
  }


  async checkPermission() {
    try {
      const status = await BarcodeScanner.checkPermission({ force: true });
      if (status.granted) {
        return true;
      } else if (status.denied) {
        const alert = await this.alert.create({
          header: 'Error',
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
              this.presentAlert('Paquete duplicado', 'Este paquete ya ha sido ingresado anteriormente.');
            } else {
              const loading = await this.loading.create({
                message: 'Cargando...',
                spinner: 'lines'
              });
              await loading.present();

              this.api.getPaqueteByCodigo(qrDataArray[0].cod).subscribe(
                async (data: any) => {
                  console.log("esto es lo q me trajo", data);
                  if (data.status != 'error') {

                    if (data.idUsuario != null && data.idUsuario != parseInt(this.uid!)) {
                      await loading.dismiss();
                      this.presentAlert('Paquete ya asignado', 'Este paquete ya ha sido asignado a otro mensajero o ya ha sido entregado.');
                      return;
                    }

                    data.idUsuario = parseInt(this.uid!);
                    data.idEstado = 2;
                    this.api.putPaquete(data).subscribe(
                      async (res: any) => {
                        console.log("esto es lo q mandamo", data);
                        if (res.status != 'error') {
                          console.log('Paquete actualizado', res);
                          await this.scannedResults.push(qrDataArray);
                          localStorage.setItem(`scannedResults_${this.uid}`, JSON.stringify(this.scannedResults));
                        } else {
                          this.presentAlert('Error', res.msj);
                        }
                        loading.dismiss();
                      },
                      async (error) => {
                        await loading.dismiss();
                        this.presentAlert('Error en el servidor', 'Ha ocurrido un error al comunicarse con el servidor. Por favor, inténtalo nuevamente.');
                      }
                    );
                  } else {
                    await loading.dismiss();
                    this.presentAlert('Error', 'El QR escaneado no es válido. Por favor, escanea un QR válido o ingresa el código manualmente.');
                  }
                },
                async (error) => {
                  await loading.dismiss();
                  this.presentAlert('Error en el servidor', 'Ha ocurrido un error al comunicarse con el servidor. Por favor, inténtalo nuevamente.');
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
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Confirmar',
          handler: async (data) => {
            if (data.manualCode) {
              const loading = await this.loading.create({
                message: 'Validando...',
                spinner: 'lines'
              });
              await loading.present();
              if (this.scannedResults.find((i: any) =>
                i.some((item: any) => item.cod === data.manualCode.toUpperCase()))) {
                await alertInput.dismiss();
                await loading.dismiss();
                this.presentAlert('Paquete duplicado', 'Este paquete ya ha sido ingresado anteriormente.');
              } else {
                this.api.getPaqueteByCodigo(data.manualCode).subscribe(
                  async (res: any) => {
                    if (res.status == 'error') {
                      await loading.dismiss();
                      this.presentAlert('Error', 'El código ingresado no es válido. Por favor, ingresa un código válido o escanea el QR.');
                    } else {

                      if (res.idUsuario != null && res.idUsuario != parseInt(this.uid!)) {
                        await loading.dismiss();
                        this.presentAlert('Paquete ya asignado', 'Este paquete ya ha sido asignado a otro mensajero o ya ha sido entregado.');
                        return;
                      }
                      res.idUsuario = parseInt(this.uid!);
                      res.idEstado = 2;
                      console.log("lo q le mandamos alla", res)
                      this.api.putPaquete(res).subscribe(
                        async (data: any) => {
                          if (data.status != 'error') {
                            console.log('Paquete actualizado', data);
                            const scannedPackage = {
                              id: res.idPaquete,
                              cod: res.codigoPaquete,
                              lat: res.lat,
                              lng: res.lng
                            };
                            await this.scannedResults.push([scannedPackage]);
                            localStorage.setItem(`scannedResults_${this.uid}`, JSON.stringify(this.scannedResults));
                          } else {
                            this.presentAlert('Error', data.msj);
                          }
                          await loading.dismiss();
                        },
                        async (error) => {
                          await loading.dismiss();
                          this.presentAlert('Error en el servidor', 'Ha ocurrido un error al comunicarse con el servidor. Por favor, inténtalo nuevamente.');
                        }
                      );
                    }
                  },
                  async (error) => {
                    await loading.dismiss();
                    this.presentAlert('Error en el servidor', 'Ha ocurrido un error al validar el código. Por favor, inténtalo nuevamente.');
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

    const alert = await this.alert.create({
      header: 'Confirmar',
      message: '¿Estás seguro de que deseas eliminar este paquete de tu lista?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar',
          handler: async () => {
            await alert.dismiss();
            const loading = await this.loading.create({
              message: 'Cargando...',
              spinner: 'lines'
            });
            await loading.present();
            const paqueteToRemove = this.scannedResults[index];

            this.api.getOnePaquete(paqueteToRemove[0].id).subscribe(
              async (data: any) => {
                if (data.status != 'error') {
                  data.idUsuario = null;
                  data.idEstado = 1;

                  this.api.putPaquete(data).subscribe(
                    async (data: any) => {
                      if (data.status != 'error') {
                        console.log('Paquete actualizado', data);
                        this.scannedResults.splice(index, 1);
                        localStorage.setItem(`scannedResults_${this.uid}`, JSON.stringify(this.scannedResults));
                      } else {
                        this.presentAlert('Error en el servidor', 'Ha ocurrido un error al comunicarse con el servidor. Por favor, inténtalo nuevamente.');
                      }
                      await loading.dismiss();
                    },
                    async (error) => {
                      await loading.dismiss();
                      this.presentAlert('Error en el servidor', 'Ha ocurrido un error al comunicarse con el servidor. Por favor, inténtalo nuevamente.');
                    }
                  );
                } else {
                  await loading.dismiss();
                  this.presentAlert('Error en el servidor', 'Ha ocurrido un error al comunicarse con el servidor. Por favor, inténtalo nuevamente.');
                }
              },
              async (error) => {
                await loading.dismiss();
                this.presentAlert('Error en el servidor', 'Ha ocurrido un error al comunicarse con el servidor. Por favor, inténtalo nuevamente.');
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


  async presentAlert(title: string, msg: string) {
    const alert = await this.alert.create({
      header: title,
      message: msg,
      buttons: ['OK']
    });

    await alert.present();
  }

}