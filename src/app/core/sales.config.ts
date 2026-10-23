// Contacto de ventas que ve quien prueba la demo del Encargado antes de iniciar sesión (mismo número que la web).
export const SALES_CONTACT = {
  // WhatsApp con código de país y sin signos ni espacios. Vacío = los botones de contacto no se muestran.
  whatsapp: '595986645450'
};

export function salesWhatsAppUrlFor(message: string): string | null {
  const phone = SALES_CONTACT.whatsapp.replace(/\D/g, '');
  return phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null;
}
