import { Injectable } from '@angular/core';
import { ResponseInterface } from '../../models/response.interface';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  url: string = 'http://127.0.0.1:3030/';

  constructor(private http: HttpClient) { }

  verifyToken(token: any): Observable<ResponseInterface> {
    const address = this.url + 'token';

    // Crear un objeto de encabezados con el token
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Token': token // Agregamos el token en el encabezado
    });

    // Configurar las opciones de la solicitud con los encabezados
    const httpOptions = {
      headers: headers
    };

    // Realizar la solicitud POST con las opciones de solicitud
    return this.http.post<ResponseInterface>(address, {}, httpOptions);
  }
}
