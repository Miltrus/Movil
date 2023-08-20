import { Injectable } from '@angular/core';
import { ResponseInterface } from '../../models/response.interface';
import { NovedadInterface } from '../../models/novedad.interface';
import { TipoNovedadInterface } from '../../models/tipo-novedad.interface';
import { EntregaInterface } from '../../models/entrega.interface';

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class NovedadService {

  url: string = 'http://localhost:3030/';

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    // Aquí agregamos el token a las cabeceras
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Token': token || ''
    });
  }

  getAllNovedades(): Observable<NovedadInterface[]> {
    let address = this.url + 'novedad';
    const headers = this.getHeaders();
    return this.http.get<NovedadInterface[]>(address, { headers });
  }

  getOneNovedad(id: any): Observable<NovedadInterface> {
    let address = this.url + 'novedad/' + id;
    const headers = this.getHeaders();
    return this.http.get<NovedadInterface>(address, { headers });
  }

  postNovedad(form: NovedadInterface): Observable<ResponseInterface> {
    let address = this.url + 'novedad';
    const headers = this.getHeaders();
    return this.http.post<ResponseInterface>(address, form, { headers });
  }

  getTipoNovedad(): Observable<TipoNovedadInterface[]> {
    const address = this.url + 'tipoNovedad';
    const headers = this.getHeaders();
    return this.http.get<TipoNovedadInterface[]>(address, { headers });
  }

  getEntrega(): Observable<EntregaInterface[]> {
    const address = this.url + 'entrega';
    const headers = this.getHeaders();
    return this.http.get<EntregaInterface[]>(address, { headers });
  }
}
