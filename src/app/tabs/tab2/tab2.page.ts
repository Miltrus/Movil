import { Component, OnDestroy } from '@angular/core';
//import { BarcodeScanner } from '@awesome-cordova-plugins/barcode-scanner/ngx';
import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { Camera, CameraResultType, Photo } from '@capacitor/camera';
import { AlertController } from '@ionic/angular';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})
export class Tab2Page implements OnDestroy {

  scannedResult: any;
  content_visibility = true;

  constructor(private alert: AlertController) { }

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
      // miramos si el permiso ha sido concedido
      const permission = await this.checkPermission();
      if (!permission) {
        return;
      }
      await BarcodeScanner.hideBackground();
      document.querySelector('body')!.classList.add('scanner-active');
      this.content_visibility = false;
      const result = await BarcodeScanner.startScan();
      console.log(result);
      this.content_visibility = true;
      BarcodeScanner.showBackground();
      document.querySelector('body')!.classList.remove('scanner-active');

      if (result.hasContent) {
        this.scannedResult = result.content;
        console.log(this.scannedResult);
      }
    } catch (error) {
      console.log(error);
      this.stopScan();
    }
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

  /* public async openCam() {
    const capturedPhoto: Photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      quality: 100
    });
  } */

}
