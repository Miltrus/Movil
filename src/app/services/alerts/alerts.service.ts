import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class AlertsService {
  constructor(private toastController: ToastController) { }

  async showSuccess(message: string, title: string) {
    const toast = await this.toastController.create({
      message: message,
      header: title,
      color: 'success',
      duration: 5000,
      position: 'bottom',
      buttons: [
        {
          text: 'Cerrar',
          role: 'cancel'
        }
      ]
    });

    await toast.present();
  }

  async showError(message: string, title: string) {
    const toast = await this.toastController.create({
      message: message,
      header: title,
      color: 'danger',
      duration: 5000,
      position: 'bottom',
      buttons: [
        {
          text: 'Cerrar',
          role: 'cancel'
        }
      ]
    });

    await toast.present();
  }

  async showWarning(message: string, title: string) {
    const toast = await this.toastController.create({
      message: message,
      header: title,
      color: 'warning',
      duration: 5000,
      position: 'bottom',
      buttons: [
        {
          text: 'Cerrar',
          role: 'cancel'
        }
      ]
    });

    await toast.present();
  }
}