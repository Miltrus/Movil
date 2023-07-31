import { Injectable } from '@angular/core';
import { LoginInterface } from '../../models/login.interface';
import { ResponseInterface } from '../../models/response.interface';

import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  url: string = 'http://127.0.0.1:3030/auth/';

  constructor(private http: HttpClient) { }

  onLogin(form: LoginInterface): Observable<ResponseInterface> {
    let address = this.url + 'login';
    return this.http.post<ResponseInterface>(address, form);
  }

  onForgotPassword(form: any): Observable<ResponseInterface> {
    let address = this.url + 'forgot-pwd';
    return this.http.post<ResponseInterface>(address, form);
  }
}