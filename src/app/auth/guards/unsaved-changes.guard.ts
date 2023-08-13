import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { AlertController } from '@ionic/angular';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {

  const alert = inject(AlertController);

  if (component.hasUnsavedChanges()) {
    alert.create({
      header: 'Cambios sin guardar',
      message: '¿Estás seguro de que deseas salir?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          handler: () => {
            return false;
          },
        },
        {
          text: 'Aceptar',
          role: 'accept',
          handler: () => {
            return true;
          },
        },
      ],
    }).then((alert) => {
      alert.present();
    });
  }

  return true;
}