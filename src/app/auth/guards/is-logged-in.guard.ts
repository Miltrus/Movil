import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AlertController, NavController } from '@ionic/angular';
import { TokenService } from 'src/app/auth/token/token.service';

export const isLoggedInGuard: CanMatchFn = () => {

  const tokenService = inject(TokenService);
  const alertController = inject(AlertController);
  const nav = inject(NavController);

  let token = localStorage.getItem('token');

  if (token) {
    return tokenService.verifyToken(token).pipe(
      map(response => {
        if (response.status == 'error') {
          nav.navigateRoot('login');
          localStorage.removeItem('token');
          localStorage.removeItem('uid');
          showAlert(alertController, 'Por favor, inicie sesión nuevamente.', 'Su sesión ha expirado');
          return false;
        } else {
          return true;
        }
      }),
      catchError(error => {
        showAlert(alertController, 'Ha ocurrido un error al comunicarse con el servidor. Por favor, inténtalo nuevamente', 'Error en el servidor');
        return of(false);
      })
    );
  } else {
    nav.navigateRoot('login');
    showAlert(alertController, 'Por favor, inicie sesión nuevamente.', 'Su sesión ha expirado');
    return of(false); // Retorna un Observable<boolean> usando el operador of
  }
};

async function showAlert(alertController: AlertController, message: string, header: string) {
  const alert = await alertController.create({
    header: header,
    message: message,
    buttons: ['Aceptar']
  });
  await alert.present();
}
