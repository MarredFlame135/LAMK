// src/components/vault/VaultZones.tsx
//
// El "Closet Digital de Alta Gama": la colección deja de ser una rejilla
// uniforme de tarjetas y se reparte en tres salas con arquitectura propia.
//
//   ZONA A · SNEAKER VAULT      calzado sobre pedestal, con luz dirigida
//   ZONA B · APPAREL WARDROBE   prendas colgadas de un riel suspendido
//   ZONA C · LUXURY VITRINE     gorras/bolsos/joyería tras cristal ahumado
//
// El reparto lo decide lib/vault-zones.ts con la MISMA tabla de categorías
// que usa el catálogo — esta pantalla no clasifica por su cuenta.
//
// --- La restricción que manda sobre todo el diseño ---
//
// Las fotos de Shopify vienen del mismo pipeline de estudio: producto sobre
// fondo gris claro, SIN canal alfa (lo mismo que obligó a que la banda del
// carrusel de la home fuera clara — ver spotlight-carousel.tsx). Así que un
// tenis no puede "flotar" de verdad sobre un pedestal oscuro: se vería el
// recuadro gris de su propia foto.
//
// La solución es la del museo real, no la del recorte: la sala es oscura y
// cada pieza vive dentro de un NICHO ILUMINADO. El nicho es claro (dentro del
// rango tonal de las fotos, con la misma viñeta radial que ya se usa en la
// home para comerse la orilla), y la arquitectura alrededor —pedestal, riel,
// cristal— es oscura. Leído junto, es exactamente una vitrina iluminada en un
// cuarto oscuro, y no hace falta recortar 265 fondos que además cambian.
//
// Consecuencia, igual que en la home: DENTRO del nicho los colores van
// hardcodeados, no con tokens de tema. Las fotos no cambian con el tema, así
// que el nicho tampoco. La arquitectura de afuera sí usa tokens.

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { CollectionItem } from '@/types/user';
import { VaultZone, groupIntoZones, acquisitionYear } from '@/lib/vault-zones';
import { HolographicCard } from '@/components/ui/holographic-card';
import { Magnetic } from '@/components/ui/Magnetic';
import { haptics } from '@/lib/haptics';
import { fadeUp, staggerContainer } from '@/lib/motion';
import { applyReaction } from '@/lib/vault-reactions-shared';
import type { ReactionSummary, ReactionValue } from '@/lib/vault-reactions-shared';

// Tono del nicho iluminado. Mismo criterio (y mismo rango medido) que
// BAND_BG en spotlight-carousel.tsx: los fondos de estudio del catálogo van
// de #E2E2E3 a #ADADAD, así que este valor cae dentro y la orilla difuminada
// desaparece contra él en vez de dibujar un recuadro.
const NICHE_BG = '#DFDCD4';

// Desvanece la orilla de la foto — puro fondo de estudio en todas.
//
// Más ancha y con caída más larga que la de la home (allá es 50%/90%): aquí
// el nicho tiene su propia luz, y una viñeta corta dibujaba un círculo
// perfectamente visible alrededor de cada pieza en vez de desaparecer.
const PHOTO_MASK = 'radial-gradient(ellipse 64% 64% at 50% 47%, #000 55%, transparent 100%)';

const RARITY_BADGE: Record<CollectionItem['rarity'], { label: string; color: string } | null> = {
  COMMON: null,
  RARE: { label: 'RARE', color: '#C5A059' },
  LEGENDARY: { label: 'LEGENDARY', color: '#FF1E42' },
};

// Comparte la pieza real (imagen + texto) vía Web Share API nativo; si el
// navegador no lo soporta (la mayoría de desktop), cae a copiar el texto al
// portapapeles — nunca falla en silencio.
async function shareCollectionItem(item: CollectionItem, onFallback: () => void) {
  const text = item.serialNumber
    ? `I just copped ${item.sneakerTitle} at LAMK — Serial ${item.serialNumber}.`
    : `I just copped ${item.sneakerTitle} at LAMK.`;
  const url = typeof window !== 'undefined' ? window.location.origin : undefined;

  if (typeof navigator === 'undefined' || !navigator.share) {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url ? `${text} ${url}` : text);
      onFallback();
    }
    return;
  }

  try {
    const res = await fetch(item.imageUrl);
    const blob = await res.blob();
    const file = new File([blob], 'lamk-vault.jpg', { type: blob.type || 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: 'Look At My Kicks', text, files: [file] });
      return;
    }
  } catch {
    // la imagen puede fallar por CORS del CDN — se cae al share de solo texto
  }

  try {
    await navigator.share({ title: 'Look At My Kicks', text, url });
  } catch {
    // usuario canceló el share nativo — no es un error real, no hacer nada
  }
}

function ShareButton({ item }: { item: CollectionItem }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <Magnetic className="absolute top-2 right-2 z-20" strength={0.25}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            haptics.tap();
            shareCollectionItem(item, () => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="flex items-center justify-center h-7 w-7 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 text-zinc-300 hover:text-white hover:border-[#C5A059]/60 transition opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          aria-label={`Flexionar o compartir ${item.sneakerTitle}`}
          title="Flexionar / Compartir"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="M8.6 13.5 15.4 17.5M15.4 6.5 8.6 10.5" />
          </svg>
        </button>
      </Magnetic>
      {copied && (
        <span className="absolute top-2 right-11 z-20 text-[9px] font-mono bg-black/85 text-emerald-400 px-1.5 py-0.5 rounded whitespace-nowrap">
          Copiado ✓
        </span>
      )}
    </>
  );
}

// La foto dentro de su nicho iluminado. Es la pieza compartida por las tres
// zonas: lo único que cambia entre A, B y C es la arquitectura de alrededor.
function LitNiche({ item, rounded = 'rounded-lg' }: { item: CollectionItem; rounded?: string }) {
  const badge =
    item.source === 'manual'
      ? { label: 'VERIFICADA', color: '#C5A059' }
      : RARITY_BADGE[item.rarity];

  return (
    <div className={`relative aspect-square overflow-hidden ${rounded}`} style={{ background: NICHE_BG }}>
      {/* Luz dirigida: cae desde arriba, como el cañón de una vitrina. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 78% 60% at 50% -6%, rgba(255,255,255,0.55), transparent 72%)' }}
        aria-hidden
      />
      {/* next/image y no <img> crudo, por dos razones y ambas son reales:
          (1) las fotos del catálogo son PNG de hasta 3.6 MB — la rejilla
          anterior de la Bóveda las servía tal cual, en tamaño completo, para
          mostrarlas a ~200px; (2) la CSP del sitio manda las imágenes por el
          optimizador de Next (mismo origen), que es como ya las carga el
          catálogo. Un <img> apuntando al CDN se queda en blanco. */}
      <Image
        src={item.imageUrl}
        alt={item.sneakerTitle}
        fill
        sizes="(max-width: 640px) 50vw, 240px"
        className="relative object-contain p-2"
        style={{ WebkitMaskImage: PHOTO_MASK, maskImage: PHOTO_MASK }}
      />
      {/* Sombra de oclusión: el contacto de la pieza con su base. Va DENTRO
          del nicho para que se lea como sombra proyectada, no como un borde. */}
      <div
        className="absolute inset-x-[22%] bottom-[8%] h-[6%] pointer-events-none blur-[2px]"
        style={{ background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(20,18,24,0.34), transparent 70%)' }}
        aria-hidden
      />
      {badge && (
        <span
          className="absolute top-1.5 left-1.5 z-10 px-1.5 py-0.5 rounded font-mono text-[8px] font-bold uppercase tracking-wide text-black"
          style={{ background: badge.color }}
        >
          {badge.label}
        </span>
      )}
    </div>
  );
}

// Me gusta / no me gusta de una pieza.
//
// Tres decisiones de comportamiento:
//
//  1. **Optimista, con reversión.** El contador se mueve en el momento del
//     clic y se corrige con lo que responda el servidor. Esperar el ida y
//     vuelta hace que el botón se sienta roto en una conexión lenta; no
//     revertir cuando falla hace que muestre un número que no es cierto.
//  2. **Pulsar lo mismo dos veces retira la reacción.** Es lo que espera
//     cualquiera que haya usado un botón de "me gusta", y evita quedarse
//     atrapado en una opinión que ya no sostienes.
//  3. **Solo totales.** Nunca se muestra quién reaccionó — ni al dueño de la
//     bóveda. Un "no me gusta" con nombre sobre las pertenencias de alguien es
//     acoso con otro nombre; el número agregado no lo es.
//
// Cuando no se puede reaccionar (visitante sin sesión, el propio dueño, o un
// escaneo de QR) los totales se siguen viendo, pero como texto, no como
// botones muertos.
function ReactionBar({
  itemId,
  title,
  summary,
  canReact,
}: {
  itemId: string;
  title: string;
  summary: ReactionSummary;
  canReact: boolean;
}) {
  const [state, setState] = useState(summary);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const react = async (value: ReactionValue) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    haptics.tap();

    const previous = state;
    // Cálculo optimista con la MISMA función que usa el servidor de referencia
    // (vault-reactions-shared.ts, probada): retira si repites, cambia de bando
    // moviendo los dos contadores, o suma si no habías reaccionado.
    setState(applyReaction(previous, value));

    try {
      const res = await fetch('/api/vault/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaultItemId: itemId, value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState(previous);
        setError(data.error || 'No se pudo registrar.');
        return;
      }
      setState({ likes: data.likes ?? 0, dislikes: data.dislikes ?? 0, mine: data.mine ?? null });
    } catch {
      setState(previous);
      setError('Sin conexión.');
    } finally {
      setBusy(false);
    }
  };

  if (!canReact) {
    if (state.likes === 0 && state.dislikes === 0) return null;
    return (
      <span className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
        <span>▲ {state.likes}</span>
        <span>▼ {state.dislikes}</span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => react(1)}
        disabled={busy}
        aria-pressed={state.mine === 1}
        aria-label={`Me gusta ${title}`}
        className={`flex items-center gap-1 rounded-full border px-2 py-1 font-mono text-[10px] transition disabled:opacity-60 ${
          state.mine === 1
            ? 'border-emerald-500/60 text-emerald-500 dark:text-emerald-400'
            : 'border-border text-muted-foreground hover:border-zinc-500 hover:text-foreground'
        }`}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M7 22V11l5-9a2.5 2.5 0 0 1 2.4 3.2L13 10h5.5a2.5 2.5 0 0 1 2.4 3.1l-1.6 6.5A3 3 0 0 1 16.4 22H7Z" />
        </svg>
        {state.likes}
      </button>

      <button
        type="button"
        onClick={() => react(-1)}
        disabled={busy}
        aria-pressed={state.mine === -1}
        aria-label={`No me gusta ${title}`}
        className={`flex items-center gap-1 rounded-full border px-2 py-1 font-mono text-[10px] transition disabled:opacity-60 ${
          state.mine === -1
            ? 'border-[#FF1E42]/60 text-[#FF1E42]'
            : 'border-border text-muted-foreground hover:border-zinc-500 hover:text-foreground'
        }`}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M17 2v11l-5 9a2.5 2.5 0 0 1-2.4-3.2L11 14H5.5a2.5 2.5 0 0 1-2.4-3.1l1.6-6.5A3 3 0 0 1 7.6 2H17Z" />
        </svg>
        {state.dislikes}
      </button>

      {error && <span role="alert" className="font-mono text-[9px] text-[#FF1E42]">{error}</span>}
    </span>
  );
}

// Placa cromada: serie, año de adquisición y sello. El año es de ADQUISICIÓN
// y no de lanzamiento a propósito — ver acquisitionYear() en lib/vault-zones.
function ChromePlate({
  item,
  reaction,
  canReact,
}: {
  item: CollectionItem;
  reaction?: ReactionSummary;
  canReact?: boolean;
}) {
  const year = acquisitionYear(item);
  const isManual = item.source === 'manual';

  return (
    <div className="relative mt-2 rounded-md border border-border bg-gradient-to-b from-muted to-card px-2.5 py-2 space-y-1">
      {/* Filo cromado superior — el brillo de una placa metálica grabada. */}
      <span
        className="absolute inset-x-2 top-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)' }}
        aria-hidden
      />
      <h4 className="text-[11px] font-bold uppercase leading-tight line-clamp-1 text-foreground">{item.sneakerTitle}</h4>

      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[9px] text-[#C5A059] tracking-tight">
          {isManual ? 'Verificada por LAMK' : item.serialNumber}
        </span>
        {year && (
          <span className="font-mono text-[9px] text-muted-foreground tracking-tight" title="Año en que esta pieza entró a tu bóveda">
            ADQ. {year}
          </span>
        )}
      </div>

      {/* Sello de autenticidad. Una pieza que vino de un pedido pagado tiene
          respaldo real (el webhook orders/paid le puso su número de serie);
          una declarada a mano la aprobó un admin. Se distinguen a propósito:
          no significan lo mismo y no deben verse igual. */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="flex items-center gap-1 text-[8px] font-mono uppercase tracking-widest text-emerald-500 dark:text-emerald-400">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {isManual ? 'Aprobada por admin' : 'Autenticidad verificada'}
        </span>

        {reaction && (
          <ReactionBar itemId={item.id} title={item.sneakerTitle} summary={reaction} canReact={Boolean(canReact)} />
        )}
      </div>
    </div>
  );
}

interface PieceProps {
  item: CollectionItem;
  index: number;
  reaction?: ReactionSummary;
  canReact?: boolean;
}

// --- ZONA A · pedestal de museo -------------------------------------------
function PedestalPiece({ item, index, reaction, canReact }: PieceProps) {
  return (
    <motion.div variants={fadeUp} custom={index} className="group">
      <HolographicCard className="relative">
        <div className="relative">
          <LitNiche item={item} rounded="rounded-t-xl rounded-b-sm" />
          <ShareButton item={item} />

          {/* El pedestal. Tres piezas: el canto superior (la línea de luz
              donde le pega el cañón), el cuerpo del bloque, y la sombra que
              proyecta sobre el piso de la sala. Sin el canto se lee como una
              barra plana pegada a la foto, no como piedra con volumen. */}
          <div
            className="mx-auto h-px w-[92%]"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(235,232,222,0.55), transparent)' }}
            aria-hidden
          />
          <div
            className="mx-auto h-5 w-[88%]"
            style={{ background: 'linear-gradient(180deg, rgba(140,140,152,0.30) 0%, rgba(46,46,54,0.55) 45%, rgba(10,10,14,0.78) 100%)' }}
            aria-hidden
          />
          <div
            className="mx-auto h-2 w-[74%] rounded-b-lg"
            style={{ background: 'linear-gradient(180deg, rgba(70,70,80,0.55), rgba(5,5,7,0.9))' }}
            aria-hidden
          />
          <div
            className="mx-auto h-3 w-[84%] blur-[4px] opacity-80"
            style={{ background: 'radial-gradient(ellipse 50% 60% at 50% 0%, rgba(0,0,0,0.7), transparent 72%)' }}
            aria-hidden
          />
        </div>
      </HolographicCard>
      <ChromePlate item={item} reaction={reaction} canReact={canReact} />
    </motion.div>
  );
}

// --- ZONA B · perchero suspendido -----------------------------------------
function HangingPiece({ item, index, reaction, canReact }: PieceProps) {
  return (
    <motion.div variants={fadeUp} custom={index} className="group relative pt-7">
      {/* Gancho: el tramo que baja del riel y engancha la prenda. El riel en
          sí lo dibuja la zona (una sola línea para toda la fila, no una por
          pieza — si no, no es un riel, son postes sueltos). */}
      <span
        className="absolute left-1/2 top-0 h-7 w-px -translate-x-1/2"
        style={{ background: 'linear-gradient(180deg, rgba(200,200,210,0.85), rgba(140,140,150,0.35))' }}
        aria-hidden
      />
      <span
        className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-zinc-400/70 bg-zinc-300/30"
        aria-hidden
      />

      <HolographicCard className="relative">
        <LitNiche item={item} rounded="rounded-lg" />
        <ShareButton item={item} />
      </HolographicCard>
      <ChromePlate item={item} reaction={reaction} canReact={canReact} />
    </motion.div>
  );
}

// --- ZONA C · vitrina de cristal ahumado ----------------------------------
function VitrinePiece({ item, index, reaction, canReact }: PieceProps) {
  return (
    <motion.div variants={fadeUp} custom={index} className="group">
      {/* Marco de la vitrina, en oro apagado de marca. El grosor del marco es
          lo que deja ver el terciopelo de adentro: con un borde delgado, la
          "vitrina" se leía igual que las otras dos zonas. */}
      <div
        className="relative rounded-xl border border-[#C5A059]/45 p-3"
        style={{ background: 'linear-gradient(160deg, #241118 0%, #160B10 55%, #0A0509 100%)' }}
      >
        {/* Terciopelo: tono vino profundo y mate, con la trama sutil que lo
            separa de un plano liso. */}
        <div
          className="relative rounded-lg overflow-hidden ring-1 ring-[#C5A059]/20"
          style={{
            background:
              'repeating-linear-gradient(45deg, #1E1017 0px, #1E1017 2px, #241319 2px, #241319 4px)',
          }}
        >
          <LitNiche item={item} rounded="rounded-lg" />

          {/* Cristal ahumado. Dos capas, porque una sola no se lee: el TINTE
              (oscurece parejo, es lo que hace que sea "ahumado") y el
              REFLEJO (la banda diagonal de luz que delata que hay un vidrio
              enfrente). pointer-events en none para no robarle el clic al
              botón de compartir. */}
          <div className="absolute inset-0 pointer-events-none rounded-lg bg-[#0B0710]/25" aria-hidden />
          <div
            className="absolute inset-0 pointer-events-none rounded-lg"
            style={{
              background:
                'linear-gradient(118deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.10) 16%, transparent 34%, transparent 68%, rgba(255,255,255,0.07) 86%, rgba(0,0,0,0.30) 100%)',
            }}
            aria-hidden
          />
          {/* Canto del cristal: la línea de luz del borde del vidrio. */}
          <div className="absolute inset-0 pointer-events-none rounded-lg ring-1 ring-inset ring-white/20" aria-hidden />
        </div>
        <ShareButton item={item} />
      </div>
      <ChromePlate item={item} reaction={reaction} canReact={canReact} />
    </motion.div>
  );
}

function ZoneSection({
  zone,
  reactions,
  canReact,
}: {
  zone: VaultZone;
  reactions?: Record<string, ReactionSummary>;
  canReact: boolean;
}) {
  const isWardrobe = zone.id === 'APPAREL_WARDROBE';

  return (
    <section className="space-y-3">
      <header className="flex items-baseline gap-3 flex-wrap">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#C5A059]/50 font-mono text-[10px] font-bold text-[#C5A059]">
          {zone.letter}
        </span>
        <h4 className="font-display text-sm font-black uppercase tracking-tight text-foreground">{zone.title}</h4>
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {zone.items.length} {zone.items.length === 1 ? 'pieza' : 'piezas'}
        </span>
        <p className="w-full text-[10px] text-muted-foreground">{zone.subtitle}</p>
      </header>

      <div
        className={`relative rounded-xl border border-border p-4 ${
          zone.id === 'LUXURY_VITRINE' ? 'bg-gradient-to-b from-muted to-card' : 'bg-card'
        }`}
      >
        {/* El riel del que cuelga TODA la fila de ropa. Una sola pieza de
            metal cruzando la sala, no un poste por prenda. */}
        {isWardrobe && (
          <>
            <span
              className="absolute left-6 right-6 top-6 h-[3px] rounded-full"
              style={{ background: 'linear-gradient(180deg, rgba(225,225,235,0.9), rgba(120,120,132,0.55))' }}
              aria-hidden
            />
            <span className="absolute left-5 top-[19px] h-3 w-3 rounded-full border border-zinc-500/60 bg-zinc-700/60" aria-hidden />
            <span className="absolute right-5 top-[19px] h-3 w-3 rounded-full border border-zinc-500/60 bg-zinc-700/60" aria-hidden />
          </>
        )}

        {/* animate="show" y NO whileInView: con whileInView, una zona que
            nacía debajo del pliegue se quedaba en opacity 0 hasta que alguien
            scrolleara — y la Zona C (la última) quedaba invisible. Además es
            lo que ya usa el resto de la Bóveda, así que las tres salas entran
            con la misma cascada que todo lo demás de la página. */}
        <motion.div
          variants={staggerContainer(0.06)}
          initial="hidden"
          animate="show"
          className={`grid grid-cols-2 sm:grid-cols-3 gap-4 ${isWardrobe ? 'pt-2' : ''}`}
        >
          {zone.items.map((item, i) => {
            const props = { item, index: i, reaction: reactions?.[item.id], canReact };
            return zone.id === 'SNEAKER_VAULT' ? (
              <PedestalPiece key={item.id} {...props} />
            ) : zone.id === 'APPAREL_WARDROBE' ? (
              <HangingPiece key={item.id} {...props} />
            ) : (
              <VitrinePiece key={item.id} {...props} />
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

export function VaultZones({
  collection,
  reactions,
  canReact = false,
}: {
  collection: CollectionItem[];
  // Solo llega en la bóveda PÚBLICA. En la propia (/vault) no hay reacciones
  // porque ahí las piezas vienen de los pedidos de Shopify y no tienen id de
  // `vault_items`, que es a lo que cuelgan las reacciones — y porque nadie
  // reacciona a su propia colección.
  reactions?: Record<string, ReactionSummary>;
  canReact?: boolean;
}) {
  const zones = groupIntoZones(collection);
  if (zones.length === 0) return null;

  return (
    <div className="space-y-6">
      {zones.map((zone) => (
        <ZoneSection key={zone.id} zone={zone} reactions={reactions} canReact={canReact} />
      ))}
    </div>
  );
}
