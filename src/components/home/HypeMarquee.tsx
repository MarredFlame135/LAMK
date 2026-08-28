// src/components/home/HypeMarquee.tsx
//
// Cinta kinética infinita con avisos de drops/restocks/beneficios del Club.
// CSS puro (translateX en loop) — cero JS por frame, no compite con el resto
// de las animaciones de la página.

const ITEMS = [
  'NUEVOS DROPS CADA SEMANA',
  'RESTOCKS AVISADOS POR WHATSAPP',
  '+1 XP POR CADA $1 MXN GASTADO — EL DOBLE EN DROPS CON HYPE',
  'ENVÍO GRATIS DESDE $3,000 MXN',
  '100% AUTHENTICATED · GARANTÍA DE AUTENTICIDAD',
  'ACCESO ANTICIPADO PARA MIEMBROS LEGEND',
];

export function HypeMarquee() {
  return (
    <div className="relative overflow-hidden bg-[#FF1E42] py-2.5 border-y border-red-900/40">
      <div className="flex w-max animate-[marquee_28s_linear_infinite] gap-10">
        {/* Set real — lo único que debe leer un lector de pantalla */}
        <div className="flex gap-10">
          {ITEMS.map((text, i) => (
            <span key={i} className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-white whitespace-nowrap">
              {text}
            </span>
          ))}
        </div>
        {/* Fix (auditoría 2026-08-27, hallazgo #7): clon solo visual para
            que el loop sea continuo — sin aria-hidden, un lector de
            pantalla leía cada aviso dos veces seguidas. */}
        <div className="flex gap-10" aria-hidden="true">
          {ITEMS.map((text, i) => (
            <span key={i} className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-white whitespace-nowrap">
              {text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
