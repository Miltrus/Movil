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
            idPaquete: item.idPaquete,
            codigoPaquete: item.codigoPaquete,
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
        this.presentAlert('Error en el servidor', 'Ha ocurrido un error al comunicarse con el servidor. Por favor, revisa tu conexión a internet o inténtalo nuevamente.');
        if (refresher) {
          refresher.complete();
        }
      });
  }

  generateWaypointsFromScannedResults(): any {
    const waypointsWithoutRounding: WayPointInterface[] = [];

    for (const i of this.scannedResults) {
      this.packageId = i[0].idPaquete;
      const roundedLat = Math.round(i[0].lat * 10000) / 10000; // redondeo a 4 decimales pa errores de precision de google 🤐
      const roundedLng = Math.round(i[0].lng * 10000) / 10000;

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
                    idPaquete: j.idPaquete,
                    idUsuario: this.uid,
                  };

                  try {
                    await this.rastreo.deleteRastreo(rastreo).toPromise();
                    await this.rastreo.postRastreo(rastreo).toPromise();
                  } catch (error) {
                    this.presentAlert('Error en el servidor', 'Ha ocurrido un error al comunicarse con el servidor. Por favor, revisa tu conexión a internet o inténtalo nuevamente.');
                  }
                }
              }

              this.generateWaypointsFromScannedResults();
              this.nav.navigateForward('tabs/mapa');
              await loading.dismiss();
            } catch (error) {
              await loading.dismiss();
              this.presentAlert('Error en el servidor', 'Ha ocurrido un error al comunicarse con el servidor. Por favor, revisa tu conexión a internet o inténtalo nuevamente.');
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
          header: 'Acceso a la cámara requerido',
          message: 'No se ha otorgado el permiso para acceder a la cámara. Por favor, otorgalo a continuación.',
          buttons: [{
            text: 'Configuración',
            handler: () => {
              BarcodeScanner.openAppSettings();
            }
          }]
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
        const loading = await this.loadingAlert('Validando...');
        try {
          const qrData: any[] = JSON.parse(result.content);
          if (qrData.every((item) =>
            Object.keys(item).length == 2 &&
            item.hasOwnProperty("idPaquete") &&
            item.hasOwnProperty("codigoPaquete")
          )) {
            const qrCod = qrData[0].codigoPaquete;

            const codExists = this.scannedResults.find((i: any) =>
              i.some((item: any) => item.codigoPaquete == qrCod)
            );

            if (codExists) {
              await loading.dismiss();
              this.presentAlert('Paquete duplicado', 'Ya has ingresado este paquete a tu lista.');
            } else {
              await loading.dismiss();
              this.assingPaq(qrCod);
            }
          } else {
            await loading.dismiss();
            this.presentAlert('QR inválido', 'El QR escaneado no es válido. Por favor, inténtalo nuevamente o introduce el código del paquete manualmente.');
          }
        } catch (error) {
          await loading.dismiss();
          this.presentAlert('QR inválido', 'El QR escaneado no es válido. Por favor, inténtalo nuevamente o introduce el código del paquete manualmente.');
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
      backdropDismiss: false,
      buttons: [
        'Cancelar',
        {
          text: 'Confirmar',
          handler: async (data) => {
            if (data.manualCode) {
              await alertInput.dismiss();
              const loading = await this.loadingAlert('Validando...');
              if (this.scannedResults.find((i: any) =>
                i.some((item: any) => item.codigoPaquete === data.manualCode.toUpperCase()))) {
                await loading.dismiss();
                this.presentAlert('Paquete duplicado', 'Ya has ingresado este paquete a tu lista.');
              } else {
                await loading.dismiss();
                await this.assingPaq(data.manualCode);
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

  async assingPaq(paq: any) {
    const loading = await this.loadingAlert('Cargando...');

    this.api.getPaqueteByCodigo(paq).subscribe(
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
              backdropDismiss: false,
              buttons: [
                'Cancelar',
                {
                  text: 'Continuar',
                  handler: async () => {
                    await alert.dismiss();
                    const confirmAlert = await this.alert.create({
                      header: 'Confirmar',
                      message: `¿Estás seguro de que deseas agregar el paquete '${data.codigoPaquete}' a tu lista?`,
                      backdropDismiss: false,
                      buttons: [
                        'Cancelar',
                        {
                          text: 'Confirmar',
                          handler: async () => {
                            await confirmAlert.dismiss();
                            this.paqEnRuta(data);
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
            await loading.dismiss();
            await this.paqEnRuta(data);
          }
        } else {
          await loading.dismiss();
          this.presentAlert('Código inválido', 'El código ingresado no es válido. Por favor, inténtalo nuevamente o escanea el QR.');
        }
      },
      async (error) => {
        await loading.dismiss();
        this.presentAlert('Error en el servidor', 'Ha ocurrido un error al comunicarse con el servidor. Por favor, revisa tu conexión a internet o inténtalo nuevamente.');
      }
    );
  }

  async paqEnRuta(data: any) {
    const loading = await this.loadingAlert('Agregando...');
    await loading.present();
    data.idUsuario = this.uid;
    data.idEstado = 2;
    this.api.putPaquete(data).subscribe(
      async (res: any) => {
        const scannedPackage = {
          idPaquete: data.idPaquete,
          codigoPaquete: data.codigoPaquete,
          lat: data.lat,
          lng: data.lng
        };
        this.scannedResults.push([scannedPackage]);
        loading.dismiss()
      },
      async (error) => {
        await loading.dismiss();
        this.presentAlert('Error en el servidor', 'Ha ocurrido un error al comunicarse con el servidor. Por favor, revisa tu conexión a internet o inténtalo nuevamente.');
      }
    );
  }


  async removePaquete(index: number) {
    const paqueteToRemove = this.scannedResults[index];
    const alert = await this.alert.create({
      header: 'Confirmar',
      message: `¿Estás seguro de que deseas eliminar el paquete '${paqueteToRemove[0].codigoPaquete}' de tu lista?`,
      buttons: [
        'Cancelar',
        {
          text: 'Confirmar',
          handler: async () => {
            await alert.dismiss();
            const loading = await this.loadingAlert('Cargando...');

            const paqToUpdate = {
              idPaquete: paqueteToRemove[0].idPaquete,
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
                this.presentAlert('Error en el servidor', 'Ha ocurrido un error al comunicarse con el servidor. Por favor, revisa tu conexión a internet o inténtalo nuevamente.');
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