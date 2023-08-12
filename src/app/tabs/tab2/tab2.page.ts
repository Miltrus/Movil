import { Component, OnDestroy } from '@angular/core';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { AlertController } from '@ionic/angular';
import { PaqueteService } from 'src/app/services/api/paquete.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})
export class Tab2Page implements OnDestroy {

  scannedResults: any = [];
  content_visibility = true;

  constructor(
    private alert: AlertController,
    private api: PaqueteService
  ) { }


  async checkPermission() {
    try {
      // pedimos el permiso
      const status = await BarcodeScanner.checkPermission({ force: true });
      if (status.granted) {
        // el permiso es concedido
        return true;
      } else if (status.denied) {
        const alert = await this.alert.create({
          header: 'Error',
          message: 'No se ha concedido el permiso para acceder a la cámara',
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
      console.log(err);
      return false;
    }
  }

  async scanQR() {
    try {
      const permission = await this.checkPermission();
      if (!permission) {
        return;
      }

      await BarcodeScanner.hideBackground();
      document.querySelector('body')!.classList.add('scanner-active');
      this.content_visibility = false;
      const result = await BarcodeScanner.startScan();
      this.content_visibility = true;
      BarcodeScanner.showBackground();
      document.querySelector('body')!.classList.remove('scanner-active');

      if (result.hasContent) {
        try {
          const qrDataArray: any[] = JSON.parse(result.content);
          if (Array.isArray(qrDataArray) && qrDataArray.length > 0) {
            const qrData = qrDataArray[0].cod;

            const codExists = this.scannedResults.some((nestedArray: any) =>
              nestedArray.some((item: any) => item.cod === qrData)
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
          }
        } catch (error) {
          const alert = await this.alert.create({
            header: 'QR no válido',
            message: 'El QR escaneado no es válido. Por favor, escanee un QR válido o introduzca el código manualmente.',
            buttons: ['OK']
          });
          await alert.present();
        }
      }
    } catch (error) {
      console.log(error);
      this.stopScan();
    }
  }

  async enterCodeManually() {
    const alert = await this.alert.create({
      header: 'Introducir código manualmente',
      inputs: [
        {
          name: 'manualCode',
          type: 'text',
          placeholder: 'Ingrese el código aquí'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Aceptar',
          handler: (data) => {
            if (data.manualCode) {
              if (this.scannedResults.some((nestedArray: any) =>
                nestedArray.some((item: any) => item.cod == data.manualCode)
              )) {
                this.alert.create({
                  header: 'Paquete duplicado',
                  message: 'Este paquete ya ha sido ingresado anteriormente.',
                  buttons: ['OK']
                }).then(alert => alert.present());
              } else {
                this.api.getPaqueteByCodigo(data.manualCode).subscribe((res: any) => {
                  if (res.status == 'error') {
                    this.alert.create({
                      header: 'Error',
                      message: 'El código ingresado no es válido. Por favor, ingrese un código válido.',
                      buttons: ['OK']
                    }).then(alert => alert.present());
                  } else {
                    const scannedPackage = {
                      cod: res.codigoPaquete,
                      lat: res.lat,
                      lng: res.lng
                    };
                    this.scannedResults.push([scannedPackage]);
                  }
                });
              }
            }
          }

        }
      ]
    });
    await alert.present();
  }

  removePaquete(index: number) {
    this.scannedResults.splice(index, 1);
  }

  async stopScan() {
    this.content_visibility = true;
    BarcodeScanner.showBackground();
    await BarcodeScanner.stopScan();
    document.querySelector('body')!.classList.remove('scanner-active');
  }

  ngOnDestroy() {
    this.stopScan();
  }

}
