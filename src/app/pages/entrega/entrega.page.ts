import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import SignaturePad from 'signature_pad';
import { EntregaInterface } from 'src/app/models/entrega.interface';
import { ListaPaquetesInterface } from 'src/app/models/lista-paquetes.interface';
import { EntregaService } from 'src/app/services/api/entrega.service';
import { NovedadService } from 'src/app/services/api/novedad.service';
import { PaqueteService } from 'src/app/services/api/paquete.service';

@Component({
  selector: 'app-entrega',
  templateUrl: './entrega.page.html',
  styleUrls: ['./entrega.page.scss'],
})
export class EntregaPage {

  @ViewChild('canvas', { static: true }) signaturePadElement?: ElementRef;

  signaturePad: any;

  newForm: FormGroup;
  listaPaquetes: ListaPaquetesInterface[] = [];
  paqId: any;
  paquete: any;

  constructor(
    private api: EntregaService,
    private alert: AlertController,
    private loading: LoadingController,
    private formBuilder: FormBuilder,
    private nav: NavController,
    private elementRef: ElementRef,
    private route: ActivatedRoute,
    private paqService: PaqueteService,
    private novService: NovedadService
  ) {
    this.newForm = this.formBuilder.group({
      firmaDestinatario: [''],
      fechaEntrega: [''],
      idLista: [21]
    });
  }

  async ngOnInit() {
    const loading = await this.loading.create({
      message: 'Cargando...',
      spinner: 'lines'
    });
    await loading.present();

    this.route.queryParams.subscribe(params => {
      this.paqId = params['paqId'];
      this.paqService.getOnePaquete(this.paqId).subscribe(data => {
        this.paquete = data;
        loading.dismiss();
      });
      return this.paqId;
    });
  }


  async save(): Promise<void> {
    this.saveSignature();
    this.dateAndTime();
    console.log(this.newForm.value);
    const confirmAlert = await this.alert.create({
      header: 'Confirmar entrega',
      message: '¿Está seguro de que deseas confirmar la entrega?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Confirmar',
          handler: async () => {
            const entregaData: EntregaInterface = this.newForm.value;
            console.log("POST: ", entregaData);
            await confirmAlert.dismiss();
            const loading = await this.loading.create({
              message: 'Guardando...',
              spinner: 'lines'
            });
            await loading.present();
            this.paquete.idEstado = 3
            this.paqService.putPaquete(this.paquete).subscribe(async data => {
              console.log(data)
              if (data?.status == 'ok') {
                await loading.dismiss();
                this.clearCanvas();
                const successAlert = await this.alert.create({
                  header: 'Entrega exitosa',
                  message: 'La entrega se ha confirmado correctamente.',
                  buttons: ['Aceptar'],
                });
                await successAlert.present();
                this.nav.back();
              } else {
                await loading.dismiss();
                const errorAlert = await this.alert.create({
                  header: 'Error',
                  message: data?.msj,
                  buttons: ['OK'],
                });
                await errorAlert.present();
              }
            });

            /* try {
              const data = await this.api.postEntrega(entregaData).toPromise();
              if (data?.status == 'ok') {
                await loading.dismiss();
                this.nav.navigateRoot('/tabs/tab1');
                this.clearCanvas();
                const successAlert = await this.alert.create({
                  header: 'Entrega exitosa',
                  message: 'La entrega se ha confirmado correctamente.',
                  buttons: ['OK'],
                });
                await successAlert.present();
              } else {
                await loading.dismiss();
                const errorAlert = await this.alert.create({
                  header: 'Error',
                  message: data?.msj,
                  buttons: ['OK'],
                });
                await errorAlert.present();
              }
            } catch (error) {
              await loading.dismiss();
              const errorAlert = await this.alert.create({
                header: 'Error en el servidor',
                message: 'Ha ocurrido un error al confirmar la entrega. Por favor, inténtalo nuevamente.',
                buttons: ['OK'],
              });
              await errorAlert.present();
            } finally {
              await loading.dismiss();
            } */
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
    const formattedFechaEntrega = `${fechaActual.getFullYear()}-${(fechaActual.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${fechaActual.getDate().toString().padStart(2, '0')} ${fechaActual.getHours().toString().padStart(2, '0')}:${fechaActual.getMinutes().toString().padStart(2, '0')}:${fechaActual.getSeconds().toString().padStart(2, '0')}`;

    this.newForm.patchValue({
      fechaEntrega: formattedFechaEntrega,
    });
  }

  saveSignature() {
    const dataURL = this.signaturePad.toDataURL('image/png');
    this.newForm.patchValue({
      firmaDestinatario: dataURL,
    });
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

  tipoNovedad: any[] = [];

  async reportNovedad() {
    const loading = await this.loading.create({
      message: 'Cargando...',
      spinner: 'lines',
    });
    await loading.present();
    this.novService.getTipoNovedad().subscribe(
      data => {
        this.tipoNovedad = data;
      },
      error => {
        console.log(error);
        this.alert.create({
          header: 'Error en el servidor',
          message: 'No se pudo cargar el tipo de novedad. Por favor, inténtalo nuevamente.',
          buttons: ['OK']
        }).then(alert => alert.present());
      }
    );
    await loading.dismiss();

    const tipoNovedadAlert = await this.alert.create({
      header: 'Tipo novedad',
      inputs: this.tipoNovedad.map((tipo: any) => ({
        type: 'radio',
        label: tipo.tipoNovedad,
        value: tipo.idTipoNovedad,
        checked: false
      })),
      buttons: [
        'Cancelar',
        {
          text: 'Siguiente',
          handler: tipoNovedadId => {
            if (!tipoNovedadId) {
              this.alert.create({
                header: 'Error',
                message: 'Debes seleccionar un tipo de novedad.',
                buttons: ['OK']
              }).then(alert => alert.present());
              return
            }
            this.mostrarDescripcionAlert(tipoNovedadId);
            console.log('seleccion:', tipoNovedadId);
          }
        }
      ]
    });

    await tipoNovedadAlert.present();
  }

  async mostrarDescripcionAlert(tipoNovedad: any) {
    const descripcionAlert = await this.alert.create({
      header: 'Detalles novedad',
      inputs: [
        {
          name: 'descripcion',
          type: 'textarea',
          placeholder: 'Detalles adicionales...'
        }
      ],
      buttons: [
        'Cancelar',
        {
          text: 'Reportar',
          handler: (data: any) => {
            const descripcion = data.descripcion;
            console.log('Idtipo:', tipoNovedad);
            console.log('desc:', descripcion);
          }
        }
      ]
    });

    await descripcionAlert.present();
  }

  getTipoNovedadById(idTipoNovedad: any) {
    return this.tipoNovedad.find(tipo => tipo.id === idTipoNovedad);
  }

  goBack() {
    this.nav.back();
  }
}
