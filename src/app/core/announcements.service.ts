import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Announcement } from './models';

@Injectable({ providedIn: 'root' })
export class AnnouncementsService {
  constructor(private http: HttpClient) {}

  getMine(): Observable<Announcement[]> {
    return this.http.get<Announcement[]>(`${environment.apiUrl}/me/announcements`);
  }
}
