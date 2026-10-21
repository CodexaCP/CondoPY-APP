import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'py.condopy.app',
  appName: 'Expenses',
  webDir: 'www',
  android: {
    // La app corre en https://localhost y la API del VPS es http: sin esto el webview bloquea las llamadas (contenido mixto).
    allowMixedContent: true
  }
};

export default config;
