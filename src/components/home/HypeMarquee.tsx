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
  const track = [...ITEMS, ...ITEMS]; // duplicado para el loop continuo

  return (
    <div className="relative overflow-hidden bg-[#FF1E42] py-2.5 border-y border-red-900/40">
      <div className="flex w-max animate-[marquee_28s_linear_infinite] gap-10">
        {track.map((text, i) => (
          <span key={i} className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-white whitespace-nowrap">
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
