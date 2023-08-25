import { Component } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AlertController, LoadingController, NavController, ToastController } from '@ionic/angular';
import { LoginInterface } from 'src/app/models/login.interface';
import { UsuarioInterface } from 'src/app/models/usuario.interface';
import { AuthService } from 'src/app/services/api/auth.service';


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

  forgotPwdForm = new FormGroup({
    documentoUsuario: new FormControl('', Validators.required),
    correoUsuario: new FormControl('', Validators.required)
  })

  constructor(
    private nav: NavController,
    private alert: AlertController,
    private loading: LoadingController,
    private auth: AuthService,
    private toast: ToastController
  ) { }

  screen: any = 'login';

  change(event: any) {
    this.screen = event;
  }

  userData: UsuarioInterface | null = null;
  showPassword: boolean = false;

  async login(form: LoginInterface) {
    const loading = await this.loading.create({
      message: 'Iniciando sesión...',
      spinner: 'lines',
    });
    await loading.present();

    this.auth.onLogin(form).subscribe(
      async (data) => {
        if (data.status == 'ok') {
          localStorage.setItem('token', data.token);
          const decodedToken = JSON.parse(atob(data.token!.split('.')[1]));
          localStorage.setItem('uid', decodedToken.uid);
          this.userData = data.user;

          await this.nav.navigateForward('/tabs/escaner');

          await loading.dismiss();
          const toast = await this.toast.create({
            header: 'Inicio de sesión exitoso',
            message: 'Bienvenido, ' + this.userData!.nombreUsuario,
            duration: 3000,
            position: 'top',
            icon: 'checkmark-circle-outline',
            mode: 'md',
            buttons: [
              {
                side: 'end',
                icon: 'close',
                role: 'cancel',
              }
            ],
          });
          toast.present();
        } else {
          await loading.dismiss();
          this.presentAlert('Error', data.msj);
        }
      },
      async (error) => {
        await loading.dismiss();
        this.presentAlert('Error en el servidor', 'Ha ocurrido un error al iniciar sesión. Por favor, revisa tu conexión a internet o inténtalo nuevamente');
      }
    );
  }

  async forgotPwd(form: any) {
    const loading = await this.loading.create({
      message: 'Validando...',
      spinner: 'lines',
    });
    await loading.present();

    this.auth.onForgotPassword(form).subscribe(
      async (data) => {
        if (data.status == 'ok') {
          await loading.dismiss();
          this.presentAlert('Revisa tu correo', data.msj);
        } else {
          await loading.dismiss();
          this.presentAlert('Error', data.msj);
        }
      },
      async (error) => {
        await loading.dismiss();
        this.presentAlert('Error en el servidor', 'Ha ocurrido un error al recuperar tu contraseña. Por favor, revisa tu conexión a internet o inténtalo nuevamente');
      }
    );
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async presentAlert(title: string, message: string) {
    const alert = await this.alert.create({
      header: title,
      message: message,
      buttons: ['OK']
    });

    await alert.present();
  }
}
