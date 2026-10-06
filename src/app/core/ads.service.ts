import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AdSlot, BuildingAds } from './models';

// Máximo de banners que se muestran juntos (el backend ya limita a 7 por edificio).
const MAX_SLOTS = 7;

// Segundos por banner si el backend no indica otro valor.
export const DEFAULT_ROTATION_SECONDS = 10;

@Injectable({ providedIn: 'root' })
export class AdsService {
  constructor(private http: HttpClient) {}

  getForBuilding(buildingId: string): Observable<BuildingAds> {
    return this.http.get<BuildingAds>(`${environment.apiUrl}/me/ad-slots`, { params: { buildingId } });
  }

  // Anuncios de todos los edificios de la persona, juntos y sin repetir. Un edificio con la publicidad apagada no aporta nada;
  // si falla uno, se ignora (los banners nunca deben molestar el resto de la pantalla).
  getForBuildings(buildingIds: string[]): Observable<BuildingAds> {
    const ids = [...new Set(buildingIds)];
    if (ids.length === 0) return of({ slots: [], managerPhone: null, rotationSeconds: DEFAULT_ROTATION_SECONDS });

    return forkJoin(ids.map(id =>
      this.getForBuilding(id).pipe(catchError(() => of({ slots: [], managerPhone: null, rotationSeconds: DEFAULT_ROTATION_SECONDS } as BuildingAds)))
    )).pipe(
      map(all => {
        const seen = new Set<string>();
        const slots: AdSlot[] = [];
        for (const s of all.reduce<AdSlot[]>((acc, a) => acc.concat(a.slots ?? []), []).sort((a, b) => a.position - b.position)) {
          if (seen.has(s.id)) continue;
          seen.add(s.id);
          slots.push(s);
        }
        // Con varios edificios se usa la rotación más corta entre los que tienen anuncios.
        const secs = all.filter(a => (a.slots?.length ?? 0) > 0 && a.rotationSeconds > 0).map(a => a.rotationSeconds);
        return {
          slots: slots.slice(0, MAX_SLOTS),
          managerPhone: all.find(a => !!a.managerPhone)?.managerPhone ?? null,
          rotationSeconds: secs.length ? Math.min(...secs) : DEFAULT_ROTATION_SECONDS
        };
      })
    );
  }

  // Dirección a abrir para el botón del anuncio: enlace tal cual, número como WhatsApp, o texto como sitio web.
  linkFor(ctaUrl: string | null | undefined): string | null {
    const raw = (ctaUrl ?? '').trim();
    if (!raw) return null;
    if (/^(https?:\/\/|tel:|mailto:)/i.test(raw)) return raw;
    if (/^[+\d][\d\s-]{5,}$/.test(raw)) return `https://wa.me/${raw.replace(/\D/g, '')}`;
    return `https://${raw}`;
  }
}
