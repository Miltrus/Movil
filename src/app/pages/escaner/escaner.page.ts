import { Component, OnDestroy } from '@angular/core';
import { BarcodeScanner, TorchStateResult } from '@capacitor-community/barcode-scanner';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import { WayPointInterface } from 'src/app/models/waypoint.interface';
import { PaqueteService } from 'src/app/services/api/paquete.service';

@Component({
  selector: 'app-escaner',
  templateUrl: 'escaner.page.html',
  styleUrls: ['escaner.page.scss']
})
export class EscanerPage implements OnDestroy {

  scannedResults: any = [];
  contentVisibility = true;
  isFlashlightOn = false;

  constructor(
    private alert: AlertController,
    private api: PaqueteService,
    private loading: LoadingController,
    private nav: NavController
  ) { }

  generateWaypointsFromScannedResults(): WayPointInterface[] {
    const waypoints: WayPointInterface[] = [];

    for (const i of this.scannedResults) {
      const latLng = { lat: i[0].lat, lng: i[0].lng };
      waypoints.push({ location: latLng, stopover: true });
    }

    return waypoints;
  }

  async startRoute() {
    const waypoints = this.generateWaypointsFromScannedResults();
    this.nav.navigateRoot('/tabs/mapa', { queryParams: { state: waypoints } });
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
              const alert = await this.alert.create({
                header: 'Paquete duplicado',
                message: 'Este paquete ya ha sido ingresado anteriormente.',
                buttons: ['OK']
              });
              await alert.present();
            } else {
              this.scannedResults.push(qrDataArray);
            }
          } else {
            const alert = await this.alert.create({
              header: 'QR inválido',
              message: 'El QR escaneado no es válido. Por favor, escanea un QR válido o introduzca el código manualmente.',
              buttons: ['OK']
            });
            await alert.present();
          }
        } catch (error) {
          const alert = await this.alert.create({
            header: 'QR inválido',
            message: 'El QR escaneado no es válido. Por favor, escanea un QR válido o introduzca el código manualmente.',
            buttons: ['OK']
          });
          await alert.present();
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
                await loading.dismiss();
                this.alert.create({
                  header: 'Paquete duplicado',
                  message: 'Este paquete ya ha sido ingresado anteriormente.',
                  buttons: ['OK']
                }).then(alert => alert.present());
              } else {
                this.api.getPaqueteByCodigo(data.manualCode).subscribe(
                  async (res: any) => {
                    await loading.dismiss();
                    if (res.status == 'error') {
                      const alert = await this.alert.create({
                        header: 'Código inválido',
                        message: 'El código ingresado no es válido. Por favor, ingresa un código válido o escanea el QR.',
                        buttons: ['OK']
                      });
                      await alert.present();
                    } else {
                      const scannedPackage = {
                        id: res.idPaquete,
                        cod: res.codigoPaquete,
                        lat: res.lat,
                        lng: res.lng
                      };
                      await this.scannedResults.push([scannedPackage]);
                      loading.dismiss();
                    }
                  },
                  async (error) => {
                    await loading.dismiss();
                    const alert = await this.alert.create({
                      header: 'Error en el servidor',
                      message: 'Ha ocurrido un error al validar el código. Por favor, inténtalo nuevamente.',
                      buttons: ['OK']
                    });
                    await alert.present();
                  }
                );
              }
            } else {
              await alertInput.dismiss();
              const alert = await this.alert.create({
                header: 'Error',
                message: 'No se ha ingresado ningún código. Por favor, ingresa un código válido o escanea el QR.',
                buttons: ['OK']
              });
              await alert.present();
            }
          }
        }
      ]
    });
    await alertInput.present();
  }

  removePaquete(index: number) {
    this.scannedResults.splice(index, 1);
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

}