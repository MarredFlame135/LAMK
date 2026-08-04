// src/components/product/ProductDetail.tsx

'use client';

import React, { useState } from 'react';
import { Product, ProductVariant } from '@/types/product';
import { HypeMeter } from '@/components/hype-meter/HypeMeter';
import { FitAdvisorBadge } from '@/components/product/FitAdvisorBadge';
import { useCart } from '@/hooks/useCart';

interface ProductDetailProps {
  product: Product;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const { addItem } = useCart();
  const [selectedImage, setSelectedImage] = useState(product.images[0] || '/placeholder-sneaker.webp');
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants.find((v) => v.isAvailable) || null
  );

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    addItem(product.title, product.id, selectedImage, selectedVariant);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 bg-[#0A0A0C] text-[#F4F4F0]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* Galería de Imágenes en Alta Resoluciòn */}
        <div className="space-y-4">
          <div className="relative aspect-square bg-[#121215] border border-zinc-800 rounded-xl overflow-hidden group">
            <img
              src={selectedImage}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {product.isSoldOut && (
              <div className="absolute top-4 right-4 bg-red-600 text-white font-bold text-xs uppercase px-3 py-1 rounded">
                AGOTADO
              </div>
            )}
          </div>

          {/* Miniaturas de Galería */}
          {product.images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border transition ${
                    selectedImage === img ? 'border-[#E60026]' : 'border-zinc-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Vista ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detalles del Producto & Selección */}
        <div className="space-y-6 flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono tracking-widest text-zinc-400 uppercase">{product.brand}</span>
            <h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tight mt-1">{product.title}</h1>
            
            {/* Precio */}
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-2xl font-bold text-[#E60026]">
                ${selectedVariant?.price.toLocaleString()} MXN
              </span>
              {selectedVariant?.compareAtPrice && (
                <span className="text-sm text-zinc-500 line-through">
                  ${selectedVariant.compareAtPrice.toLocaleString()} MXN
                </span>
              )}
            </div>

            {/* Hype Meter */}
            <HypeMeter data={product.hypeMeter} />

            {/* Selector de Tallas (MX / US Conversion) */}
            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold tracking-wider uppercase">SELECCIONA TU TALLA</span>
                <span className="text-zinc-400">Tallas en México (MX)</span>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {product.variants.map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id;
                  return (
                    <button
                      key={variant.id}
                      disabled={!variant.isAvailable}
                      onClick={() => setSelectedVariant(variant)}
                      className={`py-2.5 rounded text-xs font-bold transition border flex flex-col items-center justify-center ${
                        isSelected
                          ? 'border-[#E60026] bg-[#E60026]/10 text-[#E60026]'
                          : variant.isAvailable
                          ? 'border-zinc-800 bg-[#121215] text-zinc-200 hover:border-zinc-700'
                          : 'border-zinc-900 bg-zinc-950 text-zinc-600 cursor-not-allowed line-through'
                      }`}
                    >
                      <span>{variant.size.mx} MX</span>
                      <span className="text-[9px] text-zinc-500 font-normal">({variant.size.usMen} US)</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recomendador de Horma (Fit Advisor) */}
            <div className="mt-4">
              <FitAdvisorBadge advisor={product.fitAdvisor} />
            </div>

            {/* Storytelling del Par */}
            <div className="mt-6 p-4 bg-[#121215] border border-zinc-800/60 rounded-lg space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300">STORYTELLING</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{product.storytelling.storySummary}</p>
              <div className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-800/40">
                Colorway: <span className="text-zinc-300">{product.storytelling.colorway}</span>
              </div>
            </div>
          </div>

          {/* Botón Principal de Acción */}
          <div className="pt-4">
            {product.isSoldOut ? (
              <button
                onClick={() => alert('¡Te avisaremos por WhatsApp en cuanto vuelva a estar disponible!')}
                className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-widest rounded transition"
              >
                NOTIFICARME CUANDO VUELVA (BACK-IN-STOCK) 🔔
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={!selectedVariant}
                className="w-full py-4 bg-[#E60026] hover:bg-red-700 text-white font-black text-sm uppercase tracking-widest rounded transition shadow-lg shadow-red-900/30 flex items-center justify-center gap-2"
              >
                <span>AÑADIR AL CARRITO ESPECIAL</span>
                <span>→</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}