import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Claim, CreateClaimRequest } from './models';

@Injectable({ providedIn: 'root' })
export class ClaimsService {
  constructor(private http: HttpClient) {}

  getMine(): Observable<Claim[]> {
    return this.http.get<Claim[]>(`${environment.apiUrl}/me/claims`);
  }

  create(request: CreateClaimRequest): Observable<Claim> {
    return this.http.post<Claim>(`${environment.apiUrl}/me/claims`, request);
  }
}
