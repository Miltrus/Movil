import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AlertController, NavController } from '@ionic/angular';
import { TokenService } from 'src/app/auth/token/token.service';

export const isLoggedInGuard: CanMatchFn = (route, state) => {

  const tokenService = inject(TokenService);
  const alertController = inject(AlertController);
  const nav = inject(NavController);

  let token = localStorage.getItem('token');

  if (token) {
    return tokenService.verifyToken(token).pipe(
      map(response => {
        if (response.status === 'ok') {
          const tokenDate = JSON.parse(atob(token!.split('.')[1]));
          const expirationDate = new Date(tokenDate.exp * 1000);

          if (expirationDate < new Date()) {
            localStorage.removeItem('token');
            nav.navigateRoot('Star_Routing/login');
            showAlert(alertController, 'Por favor inicie sesión nuevamente.', 'Su sesión ha expirado');
            return false;
          }

          return true;

        } else {
          nav.navigateRoot('Star_Routing/login');
          localStorage.removeItem('token');
          showAlert(alertController, response.msj, 'Su sesión ha expirado');
          return false;
        }
      }),
      catchError(error => {
        return of(false);
      })
    );
  } else {
    nav.navigateRoot('Star_Routing/login');
    showAlert(alertController, 'Por favor inicie sesión nuevamente.', 'Su sesión ha expirado');
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
