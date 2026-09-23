import { environment } from '../../environments/environment';

// El backend devuelve las URLs de /api/uploads como ruta relativa (/uploads/archivo.jpg) para no
// atarlas al dominio del momento en que se subieron. Las URLs absolutas guardadas antes de ese
// cambio se respetan tal cual.
export function resolveUploadUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const origin = environment.apiUrl.replace(/\/api\/?$/, '');
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}
