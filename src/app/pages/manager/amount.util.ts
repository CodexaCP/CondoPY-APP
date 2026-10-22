import { AlertController, IonicSafeString } from '@ionic/angular';
import { formatGs } from './manager.util';

// Máximo de dígitos de un importe tipeado (el backend acepta hasta 9.999.999.999.999).
const MAX_DIGITS = 13;

// 1250000 -> "1.250.000" (con signo si es negativo).
export function formatMiles(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  const abs = Math.abs(Math.trunc(value));
  return (value < 0 ? '-' : '') + String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Lo que escribió la persona -> número entero: ignora puntos, espacios y letras. Con allowNegative acepta un "-" al inicio.
export function parseMiles(raw: string | null | undefined, allowNegative = false): number | null {
  const text = (raw ?? '').trim();
  const digits = text.replace(/\D/g, '').slice(0, MAX_DIGITS);
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return allowNegative && text.startsWith('-') ? -n : n;
}

// Confirmación adicional de un importe tipeado: muestra el número grande, con separador de miles, antes de guardar.
export async function confirmAmount(
  alerts: AlertController,
  header: string,
  label: string,
  amount: number,
  okText = 'Sí, es correcto',
  extra = ''
): Promise<boolean> {
  const html = `${label}<br><strong style="display:block;font-size:1.6rem;margin:0.5rem 0;color:#11364a">${formatGs(amount)}</strong>` +
    `${extra ? `${extra}<br>` : ''}Revisalo bien: ¿es correcto?`;

  return new Promise<boolean>(async resolve => {
    const alert = await alerts.create({
      header,
      message: new IonicSafeString(html),
      buttons: [
        { text: 'Corregir', role: 'cancel', handler: () => resolve(false) },
        { text: okText, handler: () => resolve(true) }
      ],
      backdropDismiss: false
    });
    await alert.present();
  });
}
