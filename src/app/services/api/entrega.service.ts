import { Injectable } from '@angular/core';
import { ResponseInterface } from 'src/app/models/response.interface';
import { EntregaInterface } from 'src/app/models/entrega.interface';

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EntregaService {

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

  postEntrega(form: EntregaInterface): Observable<ResponseInterface> {
    let address = this.url + 'entrega';
    const headers = this.getHeaders();
    return this.http.post<ResponseInterface>(address, form, { headers });
  }
}
