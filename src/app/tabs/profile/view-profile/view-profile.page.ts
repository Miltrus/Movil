import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { TipoDocumentoInterface } from 'src/app/models/tipo-documento.interface';
import { UsuarioInterface } from 'src/app/models/usuario.interface';
import { UsuarioService } from 'src/app/services/api/usuario.service';
import { ActivatedRoute } from '@angular/router';
import { AlertController, IonRefresher, LoadingController, NavController } from '@ionic/angular';

@Component({
  selector: 'app-view-profile',
  templateUrl: './view-profile.page.html',
  styleUrls: ['./view-profile.page.scss'],
})
export class ViewProfilePage implements OnInit {

  userData: UsuarioInterface | null = null;
  refresher: IonRefresher | null = null;
  tiposDocumento: TipoDocumentoInterface[] = [];
  tipoDocumentoMap: { [key: string]: string } = {};

  defaultAvatars = [
    { name: 'Por defecto', url: 'assets/icon/avatar0.png' },
    { name: 'Avatar 1', url: 'assets/icon/avatar1.png' },
    { name: 'Avatar 2', url: 'assets/icon/avatar2.jpg' },
    { name: 'Avatar 3', url: 'assets/icon/avatar3.png' },
    { name: 'Avatar 4', url: 'assets/icon/avatar4.png' },
  ];

  selectedAvatar: any;

  constructor(
    private userService: UsuarioService,
    private nav: NavController,
    private route: ActivatedRoute,
    private alert: AlertController,
    private loading: LoadingController,
  ) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const userDataString = params['userData'];
      if (userDataString) {
        try {
          const userData = JSON.parse(userDataString);
          this.userData = userData;
        } catch (error) {
          this.getUserData();
        }
      }
      this.getUserData();
    });
  }


  async getUserData(refresher?: any) {
    const loading = await this.loading.create({
      message: 'Cargando...',
    });

    await loading.present();

    const token = localStorage.getItem('token');
    const decodedToken = JSON.parse(atob(token!.split('.')[1]));
    const uid = decodedToken.uid;

    forkJoin([
      this.userService.getOneUsuario(uid),
      this.userService.getTipoDocumento(),
    ]).subscribe(
      async (data) => {
        await loading.dismiss();
        this.userData = data[0];

        // cargamos el avatar seleccionado desde localStorage para el usuario actual
        const selectedAvatarUrl = localStorage.getItem(`selectedAvatar_${this.userData?.idUsuario}`);
        this.selectedAvatar = this.defaultAvatars.find(avatar => avatar.url === selectedAvatarUrl) || this.defaultAvatars[0];

        this.tiposDocumento = data[1];

        this.tiposDocumento.forEach((tipoDocumento) => {
          this.tipoDocumentoMap[tipoDocumento.idTipoDocumento!] = tipoDocumento.nombreTipo!;
        });

        if (refresher) {
          refresher.complete(); // finaliza el refresh una vez se han actualizado los datos
        }
      },
      async (error) => {
        await loading.dismiss();
        const alert = await this.alert.create({
          header: 'Error',
          message: 'Ha ocurrido un error al cargar los datos del usuario. Por favor, inténtalo de nuevo más tarde.',
          buttons: ['Aceptar'],
        });
        await alert.present();

        if (refresher) {
          refresher.complete(); // finaliza el refresh en caso de error tambien
        }
      }
    );
  }

  getTipoDocumento(idTipoDocumento: any): string {
    return this.tipoDocumentoMap[idTipoDocumento] || '';
  }

  async changeAvatar() {
    const alert = await this.alert.create({
      header: 'Seleccionar Avatar',
      inputs: this.defaultAvatars.map((avatar, index) => ({
        type: 'radio',
        label: avatar.name,
        value: avatar,
        checked: avatar.url === (localStorage.getItem(`selectedAvatar_${this.userData?.idUsuario}`) || this.defaultAvatars[0].url),
      })),
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Aceptar',
          handler: (selected) => {
            if (selected) {
              this.selectedAvatar = selected;
              localStorage.setItem(`selectedAvatar_${this.userData?.idUsuario}`, selected.url);
            }
          },
        },
      ],
    });

    await alert.present();
  }


  openEditProfile(): void {
    this.nav.navigateForward('/tabs/profile/edit-profile', { state: { userData: this.userData } });
  }

  async logout() {
    const logOutAlert = await this.alert.create({
      header: 'Confirmar',
      message: '¿Estás seguro de que deseas cerrar sesión?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Aceptar',
          handler: async () => {
            await logOutAlert.dismiss();
            const loading = await this.loading.create({
              message: 'Cerrando sesión...',
            });
            await loading.present();

            await this.nav.navigateRoot('/login');
            localStorage.removeItem('token');
            loading.dismiss();
          }
        }
      ]
    });
    await logOutAlert.present();
  }
}