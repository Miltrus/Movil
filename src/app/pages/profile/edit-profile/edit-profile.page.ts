import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { TipoDocumentoInterface } from 'src/app/models/tipo-documento.interface';
import { UsuarioInterface } from 'src/app/models/usuario.interface';
import { UsuarioService } from 'src/app/services/api/usuario.service';
import { AlertController, IonRefresher, LoadingController, NavController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.page.html',
  styleUrls: ['./edit-profile.page.scss'],
})
export class EditProfilePage implements OnInit {

  editForm: FormGroup;
  pwdForm: FormGroup;
  dataUsuario: UsuarioInterface[] = [];
  tiposDocumento: TipoDocumentoInterface[] = [];
  showPasswordChange: boolean = false;
  showPassword: boolean = false;
  refresher: IonRefresher | null = null;

  constructor(
    private api: UsuarioService,
    private alert: AlertController,
    private loading: LoadingController,
    private formBuilder: FormBuilder,
    private nav: NavController,
    private toast: ToastController
  ) {
    this.editForm = this.formBuilder.group({
      idUsuario: [''],
      documentoUsuario: ['', [Validators.required, Validators.pattern('^[0-9]{7,10}$')]],
      idTipoDocumento: ['', Validators.required],
      nombreUsuario: ['', Validators.required],
      apellidoUsuario: ['', Validators.required],
      telefonoUsuario: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      correoUsuario: ['', [Validators.required, Validators.pattern('^[\\w.%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$')]],
      idRol: [''],
      idEstado: ['']
    });
    this.pwdForm = this.formBuilder.group({
      contrasenaUsuario: ['', [Validators.required, Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d.*\d.*\d)(?=.*[!@#$%^&+=?.:,"°~;_¿¡*/{}|<>()]).{8,}$/)]]
    });
  }


  hasUnsavedChanges(): boolean {
    return this.editForm.dirty || (this.showPasswordChange && this.pwdForm.dirty);
  }

  async ngOnInit(refresher?: any): Promise<void> {
    const loading = await this.loading.create({
      message: 'Cargando...',
      spinner: 'lines',
    });

    loading.present();

    const uid = localStorage.getItem('uid');

    const tipoDocumento$ = this.api.getTipoDocumento();
    const oneUsuario$ = this.api.getOneUsuario(uid);

    forkJoin([tipoDocumento$, oneUsuario$])
      .pipe(
        finalize(() => {
          loading.dismiss();
          if (refresher) {
            refresher.complete(); // Finaliza el "refresh" una vez se han actualizado los datos
          }
        })
      )
      .subscribe(
        ([tipoDocumento, oneUsuario]) => {
          this.tiposDocumento = tipoDocumento;
          this.dataUsuario = oneUsuario ? [oneUsuario] : [];

          this.editForm.patchValue({
            idUsuario: this.dataUsuario[0]?.idUsuario || '',
            documentoUsuario: this.dataUsuario[0]?.documentoUsuario || '',
            idTipoDocumento: this.dataUsuario[0]?.idTipoDocumento || '',
            nombreUsuario: this.dataUsuario[0]?.nombreUsuario || '',
            apellidoUsuario: this.dataUsuario[0]?.apellidoUsuario || '',
            telefonoUsuario: this.dataUsuario[0]?.telefonoUsuario || '',
            correoUsuario: this.dataUsuario[0]?.correoUsuario || '',
            idRol: this.dataUsuario[0]?.idRol || '',
            idEstado: this.dataUsuario[0]?.idEstado || ''
          });
          this.pwdForm.patchValue({
            contrasenaUsuario: this.dataUsuario[0]?.contrasenaUsuario || ''
          });
        },
        (error) => {
          const errorAlert = this.alert.create({
            header: 'Error en el servidor',
            message: 'Ha ocurrido un error al cargar los datos. Por favor, revisa tu conexión a internet o inténtalo nuevamente.',
            buttons: ['OK']
          });
          errorAlert.then((alert) => alert.present());
        }
      );
  }

  async saveChanges(): Promise<void> {
    const updatedData: UsuarioInterface = {
      ...this.editForm.value,
    };

    if (this.showPasswordChange) {
      updatedData.contrasenaUsuario = this.pwdForm.value.contrasenaUsuario;
    } else {
      delete updatedData.contrasenaUsuario;
    }

    const confirmAlert = await this.alert.create({
      header: 'Confirmar actualización',
      message: '¿Estás seguro de que deseas guardar los cambios?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Aceptar',
          handler: async () => {
            await confirmAlert.dismiss();
            const loading = await this.loading.create({
              message: 'Guardando cambios...',
              spinner: 'lines',
            });
            await loading.present();

            try {
              const data = await this.api.putUsuario(updatedData).toPromise();
              if (data?.status == 'ok') {
                this.editForm.reset();
                this.pwdForm.reset();
                this.nav.navigateRoot('/tabs/profile', { queryParams: { userData: JSON.stringify(updatedData) } });
                const toast = await this.toast.create({
                  header: 'Cambios guardados',
                  message: 'Los cambios se han guardado correctamente.',
                  duration: 3000,
                  position: 'top',
                  icon: 'checkmark',
                  mode: 'md',
                  buttons: [
                    {
                      side: 'end',
                      icon: 'close',
                      role: 'cancel',
                    }
                  ],
                });
                loading.dismiss();
                toast.present();
              } else {
                await loading.dismiss();
                const errorAlert = await this.alert.create({
                  header: 'Error',
                  message: data?.msj,
                  buttons: ['OK']
                });
                await errorAlert.present();
              }
            } catch (error) {
              const errorAlert = await this.alert.create({
                header: 'Error en el servidor',
                message: 'Ha ocurrido un error al guardar los cambios. Por favor, revisa tu conexión a internet o inténtalo nuevamente.',
                buttons: ['OK']
              });
              await errorAlert.present();
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });
    await confirmAlert.present();
  }


  async goBack() {
    if (!this.hasUnsavedChanges()) {
      this.nav.navigateBack('/tabs/profile');
    } else {
      this.showUnsavedChangesAlert();
    }
  }

  async showUnsavedChangesAlert(): Promise<void> {
    const confirmAlert = await this.alert.create({
      header: 'Cambios sin guardar',
      message: '¿Estás seguro de que deseas salir?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Aceptar',
          handler: async () => {
            await confirmAlert.dismiss();
            this.nav.navigateBack('/tabs/profile');
          }
        }
      ]
    });
    await confirmAlert.present();
  }

  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  togglePasswordChange(event: Event): void {
    event.preventDefault();
    this.showPasswordChange = !this.showPasswordChange;
  }
}
