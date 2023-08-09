import { Component, ElementRef, ViewChild } from '@angular/core';
import { NavController } from '@ionic/angular';
import SignaturePad from 'signature_pad';

@Component({
  selector: 'app-entrega',
  templateUrl: './entrega.page.html',
  styleUrls: ['./entrega.page.scss'],
})
export class EntregaPage {

  @ViewChild('canvas', { static: true }) signaturePadElement?: ElementRef;
  signaturePad: any;

  constructor(
    private elementRef: ElementRef,
    private nav: NavController,
  ) { }

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

  saveSignature() {
    const dataURL = this.signaturePad.toDataURL('image/png');
    console.log(dataURL);
    const blob = this.convertBase64toBlob(dataURL);
    console.log(blob);
  }

  convertBase64toBlob(dataURL: any): Blob {
    const base64Prefix = 'data:image/png;base64,';
    const base64Data = dataURL.substring(base64Prefix.length);

    const byteCharacters = atob(base64Data);
    const byteArrays = new Uint8Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
      byteArrays[i] = byteCharacters.charCodeAt(i);
    }

    const blob = new Blob([byteArrays], { type: 'image/png' });
    return blob;
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

  goBack() {
    this.nav.navigateBack('tabs/tab1');
  }
}
