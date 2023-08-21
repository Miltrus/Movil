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

    const headers = new HttpHeaders({
      'Token': token
    });

    return this.http.post<ResponseInterface>(address, null, { headers: headers });
  }
}
