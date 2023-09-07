import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController, NavController } from '@ionic/angular';
import SignaturePad from 'signature_pad';
import { EntregaInterface } from 'src/app/models/entrega.interface';
import { WayPointInterface } from 'src/app/models/waypoint.interface';
import { EntregaService } from 'src/app/services/api/entrega.service';
import { PaqueteService } from 'src/app/services/api/paquete.service';
import { RastreoService } from 'src/app/services/api/rastreo.service';
import { WaypointsService } from 'src/app/services/waypoints.service';

@Component({
  selector: 'app-entrega',
  templateUrl: './entrega.page.html',
  styleUrls: ['./entrega.page.scss'],
})
export class EntregaPage {

  @ViewChild('canvas', { static: true }) signaturePadElement?: ElementRef;

  signaturePad: any;

  uid = parseInt(localStorage.getItem('uid')!);
  scannedResults: any[] = [];

  formattedFechAct: any

  newForm: FormGroup;
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
    private rastreoService: RastreoService,
    private wayService: WaypointsService
  ) {
    this.newForm = this.formBuilder.group({
      firmaDestinatario: [''],
      fechaEntrega: [''],
      idRastreo: []
    });
  }

  async ngOnInit() {
    const loading = await this.loadingAlert('Cargando...');
    this.getFechAct();

    this.route.queryParams.subscribe(params => {
      this.paqId = params['paqId'];
      this.paqService.getOnePaquete(this.paqId).subscribe(async data => {
        this.paquete = data;
        await loading.dismiss();
      });
    });
  }


  async save(): Promise<void> {
    this.saveSignature();
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
            await confirmAlert.dismiss();
            const loading = await this.loadingAlert('Guardando...');
            this.paquete.idEstado = 3

            try {
              await this.paqService.putPaquete(this.paquete).toPromise();

              let getRastreo = await this.rastreoService.getRastreoByPaquete(this.paquete.idPaquete).toPromise();
              getRastreo!.idEstado = 1;

              entregaData.idRastreo = getRastreo!.idRastreo;
              await this.rastreoService.putRastreo(getRastreo).toPromise();

              await this.api.postEntrega(entregaData).toPromise();

              const paqsData = await this.paqService.getPaqueteByUser(this.uid).toPromise();
              if (paqsData!.length >= 1) {
                for (const item of paqsData!) {
                  const scannedPackage = {
                    id: item.idPaquete,
                    cod: item.codigoPaquete,
                    lat: item.lat,
                    lng: item.lng
                  };
                  this.scannedResults.push([scannedPackage]);
                }
              }

              let packageId: any

              const generateWaypointsFromScannedResults = () => {
                const waypoints: WayPointInterface[] = [];
                for (const i of this.scannedResults) {
                  packageId = i[0].id;
                  const lat = parseFloat(i[0].lat);
                  const lng = parseFloat(i[0].lng);
                  const roundedLat = Math.round(lat * 1000) / 1000; // redondeo a 3 decimales pa errores de precision de google 🤐
                  const roundedLng = Math.round(lng * 1000) / 1000;

                  const latLng = { lat: roundedLat, lng: roundedLng };
                  const waypoint: WayPointInterface = { location: latLng, stopover: true };

                  waypoints.push(waypoint);
                  this.wayService.associatePackageWithWaypoint(packageId, waypoint);
                }
                return waypoints;
              }
              const waypoints = generateWaypointsFromScannedResults();
              this.wayService.setWaypoints(waypoints);

              await loading.dismiss();
              await this.presentAlert('Entrega confirmada', 'La entrega se ha confirmado exitosamente.', 'Aceptar');
              this.nav.back();

            } catch (error) {
              await loading.dismiss();
              this.presentAlert('Error en el servidor', 'Ha ocurrido un error al confirmar la entrega. Por favor, revisa tu conexión a internet inténtalo nuevamente.', 'OK');
              return;
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

  getFechAct() {
    const fechaActual = new Date();
    this.formattedFechAct = `${fechaActual.getFullYear()}-${(fechaActual.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${fechaActual.getDate().toString().padStart(2, '0')} ${fechaActual.getHours().toString().padStart(2, '0')}:${fechaActual.getMinutes().toString().padStart(2, '0')}:${fechaActual.getSeconds().toString().padStart(2, '0')}`;

    this.newForm.patchValue({
      fechaEntrega: this.formattedFechAct,
    });
    return this.formattedFechAct
  }

  saveSignature() {
    const dataURL = this.signaturePad.toDataURL('image/png');
    this.newForm.patchValue({
      firmaDestinatario: dataURL,
    });
  }

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

  async reportNovedad() {

    const descAlert = await this.alert.create({
      header: 'Detalles adicionales',
      inputs: [
        {
          name: 'descripcion',
          type: 'textarea',
          placeholder: '¿Qué ha pasado con este paquete?'
        }
      ],
      buttons: [
        'Cancelar',
        {
          text: 'Reportar',
          handler: async (data: any) => {
            if (!data.descripcion) {
              this.presentAlert('Error', 'Debes ingresar una descripción de la novedad.', 'OK');
            } else {
              await descAlert.dismiss();
              this.paquete.idEstado = 4
              const confirmAlert = await this.alert.create({
                header: 'Confirmar reporte',
                message: 'Una vez confirmado, no podrá ser modificado o eliminado y este paquete ya no podrá ser entregado en esta ruta y deberá volver a bodega.',
                buttons: [
                  {
                    text: 'Cancelar',
                    role: 'cancel'
                  },
                  {
                    text: 'Confirmar',
                    handler: async () => {
                      await confirmAlert.dismiss();
                      const loading = await this.loadingAlert('Guardando...');

                      try {

                        await this.paqService.putPaquete(this.paquete).toPromise();

                        let getRastreo = await this.rastreoService.getRastreoByPaquete(this.paquete.idPaquete).toPromise();
                        getRastreo!.idEstado = 2;
                        getRastreo!.motivoNoEntrega = data.descripcion;
                        getRastreo!.fechaNoEntrega = this.formattedFechAct

                        await this.rastreoService.putRastreo(getRastreo).toPromise();


                        const paqsData = await this.paqService.getPaqueteByUser(this.uid).toPromise();
                        if (paqsData!.length >= 1) {
                          for (const item of paqsData!) {
                            const scannedPackage = {
                              id: item.idPaquete,
                              cod: item.codigoPaquete,
                              lat: item.lat,
                              lng: item.lng
                            };
                            this.scannedResults.push([scannedPackage]);
                          }
                        }

                        let packageId: any

                        const generateWaypointsFromScannedResults = () => {
                          const waypoints: WayPointInterface[] = [];
                          for (const i of this.scannedResults) {
                            packageId = i[0].id;
                            const lat = parseFloat(i[0].lat);
                            const lng = parseFloat(i[0].lng);
                            const roundedLat = Math.round(lat * 1000) / 1000; // redondeo a 3 decimales pa errores de precision de google 🤐
                            const roundedLng = Math.round(lng * 1000) / 1000;

                            const latLng = { lat: roundedLat, lng: roundedLng };
                            const waypoint: WayPointInterface = { location: latLng, stopover: true };

                            waypoints.push(waypoint);
                            this.wayService.associatePackageWithWaypoint(packageId, waypoint);
                          }
                          return waypoints;
                        }
                        const waypoints = generateWaypointsFromScannedResults();
                        this.wayService.setWaypoints(waypoints);

                        await loading.dismiss();
                        await this.presentAlert('Novedad reportada', 'La novedad se ha reportado exitosamente.', 'Aceptar');
                        this.nav.back();
                      } catch (error) {
                        await loading.dismiss();
                        this.presentAlert('Error en el servidor', 'Ha ocurrido un error al reportar la novedad. Por favor, revisa tu conexión a internet o inténtalo nuevamente.', 'OK');
                        return;
                      }
                    }
                  }
                ]
              });
              await confirmAlert.present();
            }
          }
        }
      ]
    });
    await descAlert.present();
  }

  goBack() {
    this.nav.back();
  }

  async presentAlert(title: string, msg: string, button: string) {
    const alert = await this.alert.create({
      header: title,
      message: msg,
      buttons: [button]
    });
    await alert.present();
  }

  async loadingAlert(msg: string) {
    const loading = await this.loading.create({
      message: msg,
      spinner: 'lines',
    });
    await loading.present();
    return loading;
  }
}
