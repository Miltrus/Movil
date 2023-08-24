import { Injectable } from '@angular/core';
import { ResponseInterface } from 'src/app/models/response.interface';
import { EntregaInterface } from 'src/app/models/entrega.interface';

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EntregaService {

  url: string = 'http://127.0.0.1:3030/';

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    // Aquí agregamos el token a las cabeceras
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Token': token || ''
    });
  }

  getAllEntregas(): Observable<EntregaInterface[]> {
    let address = this.url + 'entrega';
    const headers = this.getHeaders();
    return this.http.get<EntregaInterface[]>(address, { headers });
  }

  getOneEntrega(id: any): Observable<EntregaInterface> {
    let address = this.url + 'entrega/' + id;
    const headers = this.getHeaders();
    return this.http.get<EntregaInterface>(address, { headers });
  }

  postEntrega(form: EntregaInterface): Observable<ResponseInterface> {
    let address = this.url + 'entrega';
    const headers = this.getHeaders();
    return this.http.post<ResponseInterface>(address, form, { headers });
  }

  putEntrega(id: any): Observable<ResponseInterface> {
    let address = this.url + 'entrega/' + id;
    const headers = this.getHeaders();
    return this.http.put<ResponseInterface>(address, id, { headers });
  }

  deleteEntrega(id: any): Observable<ResponseInterface> {
    let addres = this.url + 'entrega/' + id;
    const headers = this.getHeaders();
    return this.http.delete<ResponseInterface>(addres, { headers });
  }
}
