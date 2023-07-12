import { Injectable } from '@angular/core';
import { ResponseInterface } from '../../models/response.interface';
import { UsuarioInterface } from '../../models/usuario.interface';
import { TipoDocumentoInterface } from '../../models/tipo-documento.interface';
import { EstadoUsuarioInterface } from '../../models/estado-usuario.interface';
import { RolInterface } from 'src/app/models/rol.interface';

import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  url: string = 'http://127.0.0.1:3030/';

  constructor(private http: HttpClient) { }

  getAllUsuarios(): Observable<UsuarioInterface[]> {
    let address = this.url + 'usuario';
    return this.http.get<UsuarioInterface[]>(address);
  }

  getOneUsuario(id: any): Observable<UsuarioInterface> {
    let address = this.url + 'usuario/' + id;
    return this.http.get<UsuarioInterface>(address);
  }

  postUsuario(form: UsuarioInterface): Observable<ResponseInterface> {
    let address = this.url + 'usuario';
    return this.http.post<ResponseInterface>(address, form);
  }

  putUsuario(id: any): Observable<ResponseInterface> {
    let address = this.url + 'usuario/' + id;
    return this.http.put<ResponseInterface>(address, id);
  }

  deleteUsuario(id: any): Observable<ResponseInterface> {
    let addres = this.url + 'usuario/' + id;
    return this.http.delete<ResponseInterface>(addres);
  }

  getTipoDocumento(): Observable<TipoDocumentoInterface[]> {
    const address = this.url + 'tipodocumentousuario';
    return this.http.get<TipoDocumentoInterface[]>(address);
  }

  getEstadoUsuario(): Observable<EstadoUsuarioInterface[]> {
    const address = this.url + 'estadoUsuario';
    return this.http.get<EstadoUsuarioInterface[]>(address);
  }

  getRolUsuario(): Observable<RolInterface[]> {
    const address = this.url + 'rol';
    return this.http.get<RolInterface[]>(address);
  }
}
