import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize, forkJoin } from 'rxjs';
import { TipoDocumentoInterface } from 'src/app/models/tipo-documento.interface';
import { UsuarioInterface } from 'src/app/models/usuario.interface';
import { UsuarioService } from 'src/app/services/api/usuario.service';
import { AlertController, IonRefresher, LoadingController, NavController } from '@ionic/angular';
import { HasUnsavedChanges } from 'src/app/auth/guards/unsaved-changes.guard';

@Component({
  selector: 'app-edit-profile',
  templateUrl: './edit-profile.page.html',
  styleUrls: ['./edit-profile.page.scss'],
})
export class EditProfilePage implements OnInit, HasUnsavedChanges {

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(e: BeforeUnloadEvent) {
    return this.hasUnsavedChanges() === false;
  }

  editForm: FormGroup;
  pwdForm: FormGroup;
  dataUsuario: UsuarioInterface[] = [];
  tiposDocumento: TipoDocumentoInterface[] = [];
  showPasswordChange: boolean = false;
  showPassword: boolean = false;
  refresher: IonRefresher | null = null;
  savedChanges: boolean = false;

  constructor(
    private api: UsuarioService,
    private alert: AlertController,
    private loading: LoadingController,
    private formBuilder: FormBuilder,
    private nav: NavController,
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
    return (this.editForm.dirty || this.pwdForm.dirty) && !this.savedChanges;
  }

  async ngOnInit(refresher?: any): Promise<void> {
    const loading = await this.loading.create({
      message: 'Cargando...',
    });

    await loading.present();

    const token = localStorage.getItem('token');
    const decodedToken = JSON.parse(atob(token!.split('.')[1]));
    const idUsuario = decodedToken.uid;

    const tipoDocumento$ = this.api.getTipoDocumento();
    const oneUsuario$ = this.api.getOneUsuario(idUsuario);

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
          console.error('Error:', error);
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

    try {
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
              });
              await loading.present();

              try {
                const data = await this.api.putUsuario(updatedData).toPromise();
                this.savedChanges = true;
                if (data?.status == 'ok') {
                  this.nav.navigateRoot('Star_Routing/tabs/profile', { queryParams: { userData: JSON.stringify(updatedData) } });
                  const successAlert = await this.alert.create({
                    header: 'Actualización exitosa',
                    message: 'Los cambios se han guardado correctamente.',
                    buttons: ['Aceptar']
                  });

                  await successAlert.present();

                } else {
                  const errorAlert = await this.alert.create({
                    header: 'Error',
                    message: 'No se han podido guardar los cambios. Por favor, inténtalo de nuevo más tarde.',
                    buttons: ['Aceptar']
                  });

                  await errorAlert.present();
                }
              } catch (error) {
                console.error(error);
              } finally {
                await loading.dismiss();
              }
            }
          }
        ]
      });
      await confirmAlert.present();
    } catch (error) {
      console.error(error);
    }
  }

  async goBack() {
    if (!this.hasUnsavedChanges()) {
      this.nav.navigateBack('Star_Routing/tabs/profile');
    } else {
      this.showUnsavedChangesAlert();
    }
  }

  async showUnsavedChangesAlert(): Promise<void> {
    const confirmAlert = await this.alert.create({
      header: 'Cambios sin guardar',
      message: '¿Estás seguro que deseas salir?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Aceptar',
          handler: async () => {
            await confirmAlert.dismiss();
            this.nav.navigateBack('Star_Routing/tabs/profile');
          }
        }
      ]
    });
    await confirmAlert.present();
  }

  toggleShowPassword(): void {
    this.showPassword = !this.showPassword;
  }

  togglePasswordChange(): void {
    this.showPasswordChange = !this.showPasswordChange;
  }
}
