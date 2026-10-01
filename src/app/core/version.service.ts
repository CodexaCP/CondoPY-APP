import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { App } from '@capacitor/app';
import { AlertController } from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AppVersionInfo } from './manager.models';

// El APK se distribuye fuera de Play Store y no se actualiza solo. Al abrir la app (y al volver a primer plano)
// se compara el versionCode instalado con lo que dice la API:
//   - menor que minVersionCode    -> pantalla bloqueante "Actualizá la app"
//   - menor que latestVersionCode -> aviso descartable (una vez por versión)
@Injectable({ providedIn: 'root' })
export class VersionService {
  private blockingShown = false;
  private lastNoticeVersion = 0;

  constructor(private http: HttpClient, private alerts: AlertController) {}

  async check(): Promise<void> {
    const installed = await this.installedVersionCode();
    if (installed === null) return; // navegador (ionic serve): no hay versión nativa

    let info: AppVersionInfo;
    try {
      info = await firstValueFrom(this.http.get<AppVersionInfo>(`${environment.apiUrl}/app/version`));
    } catch {
      return; // sin conexión o API caída: no se bloquea a nadie por eso
    }

    if (installed < info.minVersionCode) {
      await this.showBlocking(info);
    } else if (installed < info.latestVersionCode && this.lastNoticeVersion < info.latestVersionCode) {
      this.lastNoticeVersion = info.latestVersionCode;
      await this.showOptional(info);
    }
  }

  private async installedVersionCode(): Promise<number | null> {
    try {
      const info = await App.getInfo();
      const code = parseInt(info.build, 10);
      return Number.isFinite(code) ? code : null;
    } catch {
      return null;
    }
  }

  private async showBlocking(info: AppVersionInfo): Promise<void> {
    if (this.blockingShown) return;
    this.blockingShown = true;

    const alert = await this.alerts.create({
      header: 'Actualizá la app',
      message: info.message || 'Esta versión de CondoPY ya no es compatible. Descargá la nueva versión para seguir usándola.',
      backdropDismiss: false,
      keyboardClose: false,
      buttons: [{ text: 'Descargar', handler: () => { this.openDownload(info.apkUrl); return false; } }]
    });
    await alert.present();
  }

  private async showOptional(info: AppVersionInfo): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Hay una versión nueva',
      message: info.message || 'Descargá la última versión de CondoPY para tener las novedades.',
      buttons: [
        { text: 'Más tarde', role: 'cancel' },
        { text: 'Descargar', handler: () => this.openDownload(info.apkUrl) }
      ]
    });
    await alert.present();
  }

  private openDownload(url: string): void {
    window.open(url, '_system');
  }
}
