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
    let address = this.url + 'token';
    return this.http.post<ResponseInterface>(address, { token });
  }
}
