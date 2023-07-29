import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import { LoginInterface } from 'src/app/models/login.interface';
import { UsuarioInterface } from 'src/app/models/usuario.interface';
import { LoginService } from 'src/app/services/api/login.service';


@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {

  loginForm = new FormGroup({
    correoUsuario: new FormControl('', Validators.required),
    contrasenaUsuario: new FormControl('', Validators.required)
  })

  constructor(
    private nav: NavController,
    private alert: AlertController,
    private loading: LoadingController,
    private api: LoginService,
  ) { }

  userData: UsuarioInterface | null = null;
  showPassword: boolean = false;

  async login(form: LoginInterface) {
    const loading = await this.loading.create({
      message: 'Iniciando sesión...',
    });
    await loading.present();

    this.api.onLogin(form).subscribe(
      async (data) => {
        if (data.status == 'ok') {
          localStorage.setItem('token', data.token);
          this.userData = data.user;
          await loading.dismiss();

          this.nav.navigateForward('/tabs/profile');

          setTimeout(async () => {
            const successAlert = await this.alert.create({
              header: 'Inicio de sesión exitoso',
              message: 'Bienvenido ' + this.userData!.nombreUsuario + '!',
              buttons: ['Aceptar'],
            });
            await successAlert.present();
          }, 400);
        } else {
          await loading.dismiss();
          const alert = await this.alert.create({
            header: 'Error',
            message: data.msj,
            buttons: ['Aceptar'],
          });
          await alert.present();
        }
      },
      async (error) => {
        await loading.dismiss();
        const alert = await this.alert.create({
          header: 'Error',
          message: 'Ha ocurrido un error al iniciar sesión. Por favor, inténtalo de nuevo más tarde.',
          buttons: ['Aceptar'],
        });
        await alert.present();
      }
    );
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}
