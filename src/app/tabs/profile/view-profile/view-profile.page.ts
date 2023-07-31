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
  /* selectedImg: any; */

  constructor(
    private userService: UsuarioService,
    private nav: NavController,
    private route: ActivatedRoute,
    private alert: AlertController,
    private loading: LoadingController,
  ) { }

  ngOnInit(): void {
    /* const storedImg = localStorage.getItem('selectedImg');
    if (storedImg) {
      this.selectedImg = storedImg;
    } */
    this.getUserData();
    this.route.queryParams.subscribe(params => {
      const userData = JSON.parse(params['userData']);
      if (userData) {
        this.userData = userData;
        this.getUserData();
      } else {
        this.getUserData();
      }
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
        this.tiposDocumento = data[1];

        this.tiposDocumento.forEach((tipoDocumento) => {
          this.tipoDocumentoMap[tipoDocumento.idTipoDocumento!] = tipoDocumento.nombreTipo!;
        });

        if (refresher) {
          refresher.complete(); // Finaliza el "refresh" una vez se han actualizado los datos
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
          refresher.complete(); // Finaliza el "refresh" en caso de error también
        }
      }
    );
  }


  getTipoDocumento(idTipoDocumento: any): string {
    return this.tipoDocumentoMap[idTipoDocumento] || '';
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

            this.nav.navigateRoot('/login');
            localStorage.removeItem('token');
            loading.dismiss();
          }
        }
      ]
    });
    await logOutAlert.present();
  }
}

/* onFileSelected(event: any) {
  const file: File = event.target.files[0];
  if (file) {
    this.readFile(file);
  }
}

private readFile(file: File) {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onloadend = () => {
    this.selectedImg = reader.result as string;
    localStorage.setItem('selectedImg', this.selectedImg);
  };
} */