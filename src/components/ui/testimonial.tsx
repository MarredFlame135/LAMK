// src/components/ui/testimonial.tsx
//
// Tarjeta de testimonio con avatar, estrellas y cita. `isExample` marca
// contenido de muestra; `verifiedPurchase` marca una reseña real de un
// cliente con pedido confirmado (On-Feet Review, RF-4.4) — solo esas
// muestran el sello de Compra Verificada.

import React from 'react';
import Image from 'next/image';
import { Star, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TestimonialData {
  id: string;
  name: string;
  handle?: string;
  avatarUrl?: string;
  photoUrl?: string; // foto "on-feet" del par puesto
  quote: string;
  rating?: number; // 0-5
  isExample?: boolean;
  verifiedPurchase?: boolean;
}

export function TestimonialCard({ data, className }: { data: TestimonialData; className?: string }) {
  const rating = data.rating ?? 5;

  return (
    <div className={cn('relative p-5 bg-card border border-border rounded-2xl space-y-3', className)}>
      {data.isExample && (
        <span className="absolute top-3 right-3 text-[9px] font-mono uppercase tracking-widest text-zinc-600 border border-border rounded px-1.5 py-0.5">
          Ejemplo
        </span>
      )}

      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className={cn('h-3.5 w-3.5', i < rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-700')} />
        ))}
      </div>

      {data.photoUrl && (
        <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
          <Image src={data.photoUrl} alt={`Foto de ${data.name}`} fill sizes="320px" className="object-cover" />
        </div>
      )}

      <p className="text-sm text-zinc-300 leading-relaxed">"{data.quote}"</p>

      <div className="flex items-center gap-3 pt-2 border-t border-border/60">
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-red-600 to-amber-400 p-0.5">
          <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
            {data.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.avatarUrl} alt={data.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-black text-white">{data.name[0]}</span>
            )}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-bold text-white">{data.name}</span>
            {data.verifiedPurchase && <BadgeCheck className="h-3.5 w-3.5 text-[#FF1E42]" />}
          </div>
          {data.verifiedPurchase ? (
            <span className="text-[10px] text-emerald-400 font-mono">Compra Verificada</span>
          ) : (
            data.handle && <span className="text-[10px] text-zinc-500 font-mono">{data.handle}</span>
          )}
        </div>
      </div>
    </div>
  );
}
