import { AlertController, IonicSafeString } from '@ionic/angular';
import { formatMoneyNumber, parseAmountInput } from '../../core/locale.util';
import { formatGs } from './manager.util';

// 1250000 -> "1.250.000" (con signo si es negativo; con decimales solo si la moneda los usa y el importe los tiene).
export function formatMiles(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return formatMoneyNumber(value);
}

// Lo que escribió la persona -> número: ignora separadores de miles y letras. En guaraníes es entero; en una moneda con
// centavos acepta el separador decimal de la moneda. Con allowNegative acepta un "-" al inicio.
export function parseMiles(raw: string | null | undefined, allowNegative = false): number | null {
  return parseAmountInput(raw, allowNegative).value;
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
