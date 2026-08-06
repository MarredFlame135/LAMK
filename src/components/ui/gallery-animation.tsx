// src/components/ui/gallery-animation.tsx
//
// Galería expandible: grid de imágenes que al hacer clic se expanden a
// pantalla completa con una transición de elemento compartido (layoutId),
// sin librerías de lightbox externas. Usada para el showcase estilo
// Instagram en la home.

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

export interface GalleryItem {
  id: string;
  image: string;
  caption?: string;
  href?: string;
}

interface ExpandableGalleryProps {
  items: GalleryItem[];
}

export function ExpandableGallery({ items }: ExpandableGalleryProps) {
  const [selected, setSelected] = useState<GalleryItem | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((item) => (
          <motion.button
            key={item.id}
            layoutId={`gallery-${item.id}`}
            onClick={() => setSelected(item)}
            whileHover={{ scale: 1.03 }}
            className="relative aspect-square rounded-xl overflow-hidden border border-zinc-800 bg-black group"
          >
            <Image src={item.image} alt={item.caption || 'Publicación'} fill sizes="240px" className="object-cover group-hover:scale-110 transition duration-500" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-end p-3 opacity-0 group-hover:opacity-100">
              {item.caption && <span className="text-[10px] text-white font-bold uppercase line-clamp-2">{item.caption}</span>}
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
            onClick={() => setSelected(null)}
          >
            <motion.div
              layoutId={`gallery-${selected.id}`}
              className="relative w-full max-w-lg aspect-square rounded-2xl overflow-hidden border border-zinc-800"
              onClick={(e) => e.stopPropagation()}
            >
              <Image src={selected.image} alt={selected.caption || 'Publicación'} fill sizes="512px" className="object-cover" />
              {selected.caption && (
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black via-black/60 to-transparent">
                  <p className="text-xs text-white font-bold uppercase">{selected.caption}</p>
                </div>
              )}
            </motion.div>
            <button
              onClick={() => setSelected(null)}
              className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-white"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
