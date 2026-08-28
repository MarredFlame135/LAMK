// src/app/(routes)/aviso-de-privacidad/page.tsx
//
// Aviso de privacidad real, no un placeholder — pero tampoco es asesoría
// legal: los datos y finalidades descritos abajo reflejan lo que el sitio
// REALMENTE recolecta hoy (ver ProductDetail/SpecialCartDrawer/auth/*), no
// texto genérico. Aun así, antes de operar formalmente conviene que un
// abogado especializado en protección de datos (LFPDPPP) lo revise —
// esto cubre la forma, no sustituye esa revisión.

import React from 'react';
import { SAAS_CONFIG } from '@/lib/saas-config';

export const metadata = { title: `Aviso de Privacidad | ${SAAS_CONFIG.brandName}` };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-black uppercase tracking-tight">{title}</h2>
      <div className="text-sm text-zinc-400 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-10">
        <div className="border-b border-border pb-6">
          <span className="text-xs font-mono text-[#FF1E42] uppercase tracking-widest">// Legal</span>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight mt-1">Aviso de Privacidad</h1>
          <p className="text-xs text-zinc-400 mt-2">Última actualización: {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>

        <Section title="Responsable de tus datos">
          <p>
            {SAAS_CONFIG.brandName} ("nosotros") es responsable del tratamiento de tus datos personales conforme a la Ley
            Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP). Puedes contactarnos en{' '}
            <a href={`mailto:${SAAS_CONFIG.supportEmail}`} className="text-[#FF1E42] hover:underline">{SAAS_CONFIG.supportEmail}</a>.
          </p>
        </Section>

        <Section title="Qué datos recolectamos">
          <ul className="list-disc list-inside space-y-1.5">
            <li>Datos de contacto: nombre, correo electrónico, número de WhatsApp.</li>
            <li>Dirección de envío: calle, número, colonia, código postal, ciudad y estado.</li>
            <li>Datos de cuenta: correo y contraseña (encriptada) al registrarte.</li>
            <li>Historial de compras y navegación en el catálogo (para el Hype Meter, recomendaciones y tu nivel de coleccionista).</li>
            <li>El pago con tarjeta u OXXO lo procesa directamente Shopify — nosotros nunca vemos ni guardamos tu número de tarjeta.</li>
          </ul>
        </Section>

        <Section title="Para qué usamos tus datos">
          <ul className="list-disc list-inside space-y-1.5">
            <li>Procesar y dar seguimiento a tus pedidos, incluida la verificación por WhatsApp antes de confirmar una compra.</li>
            <li>Avisarte sobre el estado de tu pedido, disponibilidad de restock y apartados.</li>
            <li>Personalizar tu experiencia (tallas guardadas, marcas de interés, tu bóveda de coleccionista).</li>
            <li>Atención al cliente vía nuestro asistente TENISIN y soporte directo.</li>
          </ul>
        </Section>

        <Section title="Con quién compartimos tus datos">
          <p>
            Compartimos los datos estrictamente necesarios con: Shopify (procesamiento de pagos y checkout) y, cuando
            aplique, la paquetería que elijas (FedEx, DHL o Estafeta) para la entrega. No vendemos ni rentamos tus datos
            a terceros con fines publicitarios.
          </p>
        </Section>

        <Section title="Tus derechos ARCO">
          <p>
            Tienes derecho a Acceder, Rectificar, Cancelar u Oponerte (ARCO) al uso de tus datos personales en cualquier
            momento. Para ejercer estos derechos, escríbenos a{' '}
            <a href={`mailto:${SAAS_CONFIG.supportEmail}`} className="text-[#FF1E42] hover:underline">{SAAS_CONFIG.supportEmail}</a>{' '}
            indicando tu nombre y el derecho que deseas ejercer. Responderemos en un plazo máximo de 20 días hábiles.
          </p>
        </Section>

        <Section title="Cambios a este aviso">
          <p>
            Podemos actualizar este aviso de privacidad. Los cambios importantes se notificarán en esta misma página con
            la fecha de última actualización.
          </p>
        </Section>
      </div>
    </div>
  );
}
