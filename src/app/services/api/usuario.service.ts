import { Injectable } from '@angular/core';
import { ResponseInterface } from '../../models/response.interface';
import { UsuarioInterface } from '../../models/usuario.interface';
import { TipoDocumentoInterface } from '../../models/tipo-documento.interface';

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

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

  getOneUsuario(id: any): Observable<UsuarioInterface> {
    let address = this.url + 'usuario/' + id;
    const headers = this.getHeaders();
    return this.http.get<UsuarioInterface>(address, { headers });
  }

  putUsuario(id: any): Observable<ResponseInterface> {
    let address = this.url + 'usuario/' + id;
    const headers = this.getHeaders();
    return this.http.put<ResponseInterface>(address, id, { headers });
  }

  getTipoDocumento(): Observable<TipoDocumentoInterface[]> {
    const address = this.url + 'tipodocumentousuario';
    const headers = this.getHeaders();
    return this.http.get<TipoDocumentoInterface[]>(address, { headers });
  }
}
