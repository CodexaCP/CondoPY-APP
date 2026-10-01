import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { finalize, map, shareReplay, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ManagerBuilding } from './manager.models';

const KEY = 'condopy_manager_building';

// Edificio con el que está trabajando el Encargado. Si tiene uno solo, se elige solo; si tiene varios, se
// recuerda el último elegido. Todos los pedidos de la sección mandan este buildingId explícito.
@Injectable({ providedIn: 'root' })
export class BuildingContextService {
  private readonly buildingsSubject = new BehaviorSubject<ManagerBuilding[]>([]);
  private readonly selectedSubject = new BehaviorSubject<ManagerBuilding | null>(null);
  private loaded = false;
  private pending$: Observable<ManagerBuilding[]> | null = null;

  readonly buildings$ = this.buildingsSubject.asObservable();
  readonly selected$ = this.selectedSubject.asObservable();

  constructor(private http: HttpClient) {}

  get buildings(): ManagerBuilding[] { return this.buildingsSubject.value; }
  get selected(): ManagerBuilding | null { return this.selectedSubject.value; }
  get selectedId(): string | null { return this.selectedSubject.value?.id ?? null; }

  // Carga la lista una vez por sesión (o de nuevo si force). Devuelve los edificios.
  // Si ya hay un pedido en curso (el shell y la pantalla activa lo piden a la vez) se comparte.
  load(force = false): Observable<ManagerBuilding[]> {
    if (this.loaded && !force) return of(this.buildings);
    if (this.pending$) return this.pending$;

    this.pending$ = this.http.get<ManagerBuilding[]>(`${environment.apiUrl}/buildings`).pipe(
      map(list => (list ?? []).filter(b => b.isActive !== false).sort((a, b) => a.name.localeCompare(b.name))),
      tap(list => {
        this.loaded = true;
        this.buildingsSubject.next(list);
        this.selectedSubject.next(this.pickInitial(list));
      }),
      finalize(() => { this.pending$ = null; }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    return this.pending$;
  }

  select(id: string): void {
    const found = this.buildings.find(b => b.id === id);
    if (!found) return;
    try { localStorage.setItem(KEY, id); } catch { /* sin almacenamiento: no se recuerda */ }
    this.selectedSubject.next(found);
  }

  // Al cerrar sesión (o cambiar de usuario) se olvida todo.
  clear(): void {
    this.loaded = false;
    this.buildingsSubject.next([]);
    this.selectedSubject.next(null);
    try { localStorage.removeItem(KEY); } catch { /* nada */ }
  }

  private pickInitial(list: ManagerBuilding[]): ManagerBuilding | null {
    if (list.length === 0) return null;
    let saved: string | null = null;
    try { saved = localStorage.getItem(KEY); } catch { /* nada */ }
    return list.find(b => b.id === saved) ?? list[0];
  }
}
