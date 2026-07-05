import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AnnouncementsService } from '../../core/announcements.service';
import { Announcement } from '../../core/models';

const CATEGORY_COLOR: Record<string, string> = {
  General:      '#3b82f6',
  Mantenimiento:'#f59e0b',
  Seguridad:    '#ef4444',
  Financiero:   '#22c55e',
  Convocatoria: '#8b5cf6',
  Otro:         '#64748b'
};

const CATEGORY_ICON: Record<string, string> = {
  General:      'information-circle-outline',
  Mantenimiento:'construct-outline',
  Seguridad:    'shield-checkmark-outline',
  Financiero:   'cash-outline',
  Convocatoria: 'megaphone-outline',
  Otro:         'ellipsis-horizontal-circle-outline'
};

@Component({
  selector: 'app-area-comun',
  templateUrl: './area-comun.page.html',
  styleUrls: ['./area-comun.page.scss'],
  standalone: false,
})
export class AreaComunPage {
  items: Announcement[] = [];
  loading = false;
  error = '';

  constructor(
    private router: Router,
    private svc: AnnouncementsService
  ) {}

  ionViewWillEnter(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.svc.getMine().subscribe({
      next: items => { this.items = items; this.loading = false; },
      error: () => { this.error = 'No se pudieron cargar los comunicados.'; this.loading = false; }
    });
  }

  refresh(event: any): void {
    this.svc.getMine().subscribe({
      next: items => { this.items = items; event.target.complete(); },
      error: () => { event.target.complete(); }
    });
  }

  categoryColor(cat: string): string { return CATEGORY_COLOR[cat] ?? '#64748b'; }
  categoryIcon(cat: string): string  { return CATEGORY_ICON[cat]  ?? 'megaphone-outline'; }

  dateLabel(value: string | null): string {
    if (!value) return '';
    return new Intl.DateTimeFormat('es-PY', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(value));
  }

  goHome(): void { this.router.navigateByUrl('/home'); }
}
