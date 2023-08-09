import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import SignaturePad from 'signature_pad';
import { EntregaInterface } from 'src/app/models/entrega.interface';
import { ListaPaquetesInterface } from 'src/app/models/lista-paquetes.interface';
import { EntregaService } from 'src/app/services/api/entrega.service';

/* import { format } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz'; */

@Component({
  selector: 'app-entrega',
  templateUrl: './entrega.page.html',
  styleUrls: ['./entrega.page.scss'],
})
export class EntregaPage implements OnInit {

  @ViewChild('canvas', { static: true }) signaturePadElement?: ElementRef;
  signaturePad: any;

  newForm: FormGroup;

  listaPaquetes: ListaPaquetesInterface[] = [];

  constructor(
    private api: EntregaService,
    private alert: AlertController,
    private loading: LoadingController,
    private formBuilder: FormBuilder,
    private nav: NavController,
    private elementRef: ElementRef,
  ) {
    this.newForm = this.formBuilder.group({
      firmaDestinatario: [''],
      fechaEntrega: [''],
      idLista: [21]
    });
  }

  async ngOnInit(): Promise<void> {
    const loading = await this.loading.create({
      message: 'Cargando...',
    });

    /* await loading.present(); */
  }

  async save(): Promise<void> {
    this.saveSignature();
    const confirmAlert = await this.alert.create({
      header: 'Confirmar entrega',
      message: '¿Está seguro de que desea confirmar la entrega?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Aceptar',
          handler: async () => {
            this.dateAndTime();
            const entregaData: EntregaInterface = this.newForm.value;
            console.log("POST: ",entregaData);
            await confirmAlert.dismiss();
            const loading = await this.loading.create({
              message: 'Guardando...',
            });
            await loading.present();

            try {
              const data = await this.api.postEntrega(entregaData).toPromise();
              if (data?.status === 'ok') {
                await loading.dismiss();
                this.nav.navigateRoot('/tabs/tab1');
                this.clearCanvas();
                const successAlert = await this.alert.create({
                  header: 'Entrega exitosa',
                  message: 'La entrega se ha confirmado correctamente.',
                  buttons: ['Aceptar'],
                });
                await successAlert.present();
              } else {
                await loading.dismiss();
                const errorAlert = await this.alert.create({
                  header: 'Error',
                  message: data?.msj,
                  buttons: ['Aceptar'],
                });
                await errorAlert.present();
              }
            } catch (error) {
              console.error('Error:', error);
              const errorAlert = await this.alert.create({
                header: 'Error',
                message: 'Ha ocurrido un error al confirmar la entrega.',
                buttons: ['Aceptar'],
              });
              await errorAlert.present();
            } finally {
              await loading.dismiss();
            }
          },
        },
      ],
    });
    await confirmAlert.present();
  }

  init() {
    const canvas: any = this.elementRef.nativeElement.querySelector('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 140;
    console.log(canvas.width, ' -- ', canvas.height);

    if (this.signaturePad) {
      this.signaturePad.clear();
    }
  }

  public ngAfterViewInit(): void {
    this.signaturePad = new SignaturePad(this.signaturePadElement?.nativeElement, {
      penColor: 'rgb(0,0,0)',
      backgroundColor: 'rgb(255,255,255)'
    });
    this.signaturePad.clear();
  }

  dateAndTime() {
    const fechaActual = new Date();
    this.newForm.patchValue({
      fechaEntrega: fechaActual.toISOString(),
    });
    console.log(this.newForm.value);
  }

  /* dateAndTimeColombia() {
    const fechaActual = new Date();
    const zonaHorariaColombia = 'America/Bogota';
    const fechaEntrega = utcToZonedTime(fechaActual, zonaHorariaColombia);
    this.newForm.patchValue({
      fechaEntrega: format(fechaEntrega, "yyyy-MM-dd'T'HH:mm:ssxxx"),
    });
    console.log(this.newForm.value);
  } */

  saveSignature() {
    const dataURL = this.signaturePad.toDataURL('image/png');
    this.newForm.patchValue({
      firmaDestinatario: dataURL,
    });
    console.log(this.newForm.value);
    /* const blob = this.convertBase64toBlob(dataURL);
    console.log(blob); */
  }

  /* convertBase64toBlob(dataURL: any): Blob {
    const base64Prefix = 'data:image/png;base64,';
    const base64Data = dataURL.substring(base64Prefix.length);

    const byteCharacters = atob(base64Data);
    const byteArrays = new Uint8Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteArrays[i] = byteCharacters.charCodeAt(i);
    }

    const blob = new Blob([byteArrays], { type: 'image/png' });
    return blob;
  } */

  isCanvasBlank(): boolean {
    if (this.signaturePad) {
      return this.signaturePad.isEmpty() ? true : false;
    } else {
      return false;
    }
  }

  clearCanvas() {
    this.signaturePad.clear();
  }

  goBack() {
    this.nav.navigateBack('tabs/tab1');
  }
}
