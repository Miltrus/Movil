import { Injectable } from '@angular/core';
import { PaqueteInterface } from '../../models/paquete.interface';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaqueteService {

  url: string = 'https://api-star-routing.onrender.com/';

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    // Aquí agregamos el token a las cabeceras
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Token': token || ''
    });
  }

  getOnePaquete(id: any): Observable<PaqueteInterface> {
    let address = this.url + 'paquete/' + id;
    const headers = this.getHeaders();
    return this.http.get<PaqueteInterface>(address, { headers });
  }

  getPaqueteByUser(uid: any) {
    let address = this.url + 'paquete/usuario/' + uid
    const headers = this.getHeaders();
    return this.http.get<PaqueteInterface[]>(address, { headers });
  }

  getPaqueteByCodigo(codigo: any): Observable<PaqueteInterface> {
    let address = this.url + 'paquete/data/' + codigo;
    const headers = this.getHeaders();
    return this.http.get<PaqueteInterface>(address, { headers });
  }

  putPaquete(id: any): Observable<any> {
    let address = this.url + 'paquete/' + id;
    const headers = this.getHeaders();
    return this.http.put<any>(address, id, { headers });
  }
}
