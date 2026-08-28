// src/components/product/ProductDetail.tsx

'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Product, ProductVariant } from '@/types/product';
import { HypeMeter } from '@/components/hype-meter/HypeMeter';
import { FitAdvisorBadge } from '@/components/product/FitAdvisorBadge';
import { useCart } from '@/hooks/useCart';
import { CATEGORY_LABELS } from '@/lib/catalog';
import { useApp } from '@/context/AppContext';
import { logDemandRequest } from '@/hooks/useLeads';
import { haptics } from '@/lib/haptics';
import { isValidMexicanPhone } from '@/lib/validators';
import { CountUp } from '@/components/ui/count-up';
import { AuthenticitySeal } from '@/components/ui/AuthenticitySeal';
import { Magnetic } from '@/components/ui/Magnetic';
import { fadeUp, staggerContainer } from '@/lib/motion';
import { track } from '@/lib/analytics';

interface ProductDetailProps {
  product: Product;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const { addItem } = useCart();

  // Fix (hallazgo #2 de la auditoría de Fase 5): primer paso real del
  // embudo de compra (vista → carrito → checkout) — antes no existía
  // ninguna señal de "alguien vio esta ficha".
  useEffect(() => {
    track('product_view', { productId: product.id, handle: product.handle, category: product.category });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const { t } = useApp();
  const [selectedImage, setSelectedImage] = useState(product.images[0] || '/placeholder-sneaker.svg');
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants.find((v) => v.isAvailable) || null
  );
  const [notifyPhone, setNotifyPhone] = useState('');
  const [notifySubmitted, setNotifySubmitted] = useState(false);

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    addItem(product.title, product.id, selectedImage, selectedVariant);
    haptics.success();
  };

  const handleNotifyMe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidMexicanPhone(notifyPhone)) return;
    logDemandRequest({
      productId: product.id,
      productTitle: product.title,
      requestedSize: selectedVariant?.sizeLabel || (selectedVariant ? `${selectedVariant.size.mx} MX` : undefined),
      customerPhone: notifyPhone,
      rawQuery: product.title,
      wasMatched: false,
    });
    haptics.success();
    setNotifySubmitted(true);
  };

  return (
    <motion.div
      variants={staggerContainer(0.1)}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto px-4 py-8 bg-background text-foreground"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

        {/* Galería de Imágenes en Alta Resolución — zoom interactivo: mueve el
            cursor para acercar (desktop), toca para alternar zoom (mobile) */}
        <motion.div variants={fadeUp} className="space-y-4">
          <div
            className="relative aspect-square bg-card border border-border rounded-xl overflow-hidden group cursor-zoom-in"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setZoomOrigin({
                x: ((e.clientX - rect.left) / rect.width) * 100,
                y: ((e.clientY - rect.top) / rect.height) * 100,
              });
            }}
            onMouseEnter={() => setIsZoomed(true)}
            onMouseLeave={() => setIsZoomed(false)}
            onClick={() => setIsZoomed((z) => !z)}
          >
            <Image
              src={selectedImage}
              alt={product.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              style={{ transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%` }}
              className={`object-cover transition-transform duration-300 ease-out ${isZoomed ? 'scale-[1.9]' : 'scale-100'}`}
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
                  onClick={() => { setSelectedImage(img); setIsZoomed(false); }}
                  className={`relative w-20 h-20 rounded-lg overflow-hidden border transition ${
                    selectedImage === img ? 'border-[#FF1E42]' : 'border-border opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image src={img} alt={`Vista ${idx}`} fill sizes="80px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Detalles del Producto & Selección */}
        <motion.div variants={fadeUp} className="space-y-6 flex flex-col justify-between">
          <div>
            <span className="text-xs font-mono tracking-widest text-zinc-400 uppercase">{product.brand}</span>
            <h1 className="font-display text-2xl lg:text-3xl font-black uppercase tracking-tight mt-1">{product.title}</h1>
            
            {/* Precio */}
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-2xl font-bold text-[#FF1E42] font-mono">
                <CountUp value={selectedVariant?.price ?? 0} prefix="$" suffix=" MXN" />
              </span>
              {selectedVariant?.compareAtPrice && (
                <span className="text-sm text-zinc-500 line-through">
                  ${selectedVariant.compareAtPrice.toLocaleString()} MXN
                </span>
              )}
            </div>

            {/* Hype Meter */}
            <HypeMeter data={product.hypeMeter} />

            {/* Selector de Talla: calzado usa conversión MX/US, el resto usa su propia talla (S/M/L, ÚNICA, AJUSTABLE...) */}
            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold tracking-wider uppercase">SELECCIONA TU TALLA</span>
                <span className="text-zinc-400">{product.category === 'SNEAKERS' ? 'Tallas en México (MX)' : CATEGORY_LABELS[product.category]}</span>
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
                          ? 'border-[#FF1E42] bg-[#FF1E42]/10 text-[#FF1E42]'
                          : variant.isAvailable
                          ? 'border-border bg-card text-zinc-200 hover:border-zinc-700'
                          : 'border-border bg-zinc-950 text-zinc-600 cursor-not-allowed line-through'
                      }`}
                    >
                      {variant.sizeLabel ? (
                        <span>{variant.sizeLabel}</span>
                      ) : (
                        <>
                          <span>{variant.size.mx} MX</span>
                          <span className="text-[9px] text-zinc-500 font-normal">({variant.size.usMen} US)</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Conversión instantánea de talla — solo aplica a calzado real (sizeLabel = prenda no-calzado) */}
              {product.category === 'SNEAKERS' && selectedVariant && !selectedVariant.sizeLabel && (
                <div className="grid grid-cols-5 gap-2 pt-1 text-center">
                  {[
                    { label: 'MX', value: selectedVariant.size.mx },
                    { label: 'US MEN', value: selectedVariant.size.usMen },
                    { label: 'US WOMEN', value: selectedVariant.size.usWomen },
                    { label: 'EU', value: selectedVariant.size.eu },
                    { label: 'CM', value: selectedVariant.size.cm },
                  ].map((s) => (
                    <div key={s.label} className="p-1.5 rounded bg-muted border border-border/60">
                      <p className="text-[9px] font-mono text-zinc-500 uppercase">{s.label}</p>
                      <p className="text-xs font-bold font-mono">{s.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recomendador de Horma (Fit Advisor) */}
            <div className="mt-4">
              <FitAdvisorBadge advisor={product.fitAdvisor} />
            </div>

            {/* Storytelling del Par */}
            <div className="mt-6 p-4 bg-card border border-border/60 rounded-lg space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300">{t.product.storytelling}</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">{product.storytelling.storySummary}</p>
              <div className="text-[11px] text-zinc-500 pt-1 border-t border-border/40">
                Colorway: <span className="text-zinc-300">{product.storytelling.colorway}</span>
              </div>
            </div>

            {/* Sello de Autenticidad */}
            <div className="mt-4">
              <AuthenticitySeal />
            </div>
          </div>

          {/* Botón Principal de Acción */}
          <div className="pt-4">
            {product.isSoldOut ? (
              notifySubmitted ? (
                <div className="w-full py-4 bg-emerald-950/40 border border-emerald-800 text-emerald-400 font-bold text-xs uppercase tracking-widest rounded text-center">
                  CONFIRMADO · Te avisaremos por WhatsApp en cuanto vuelva
                </div>
              ) : (
                <form onSubmit={handleNotifyMe} className="flex gap-2">
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="Tu WhatsApp a 10 dígitos"
                    value={notifyPhone}
                    onChange={(e) => setNotifyPhone(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 min-h-[48px] px-4 bg-black border border-border rounded text-sm text-white outline-none focus:border-[#FF1E42]"
                  />
                  <button
                    type="submit"
                    className="px-5 min-h-[48px] bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase tracking-widest rounded transition whitespace-nowrap"
                  >
                    {t.product.notifyBackInStock}
                  </button>
                </form>
              )
            ) : (
              <Magnetic className="block w-full" strength={0.25}>
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedVariant}
                  className="w-full py-4 bg-[#FF1E42] hover:bg-red-700 text-white font-black text-sm uppercase tracking-widest rounded transition shadow-lg shadow-red-900/30 flex items-center justify-center gap-2"
                >
                  <span>{t.product.addToCart}</span>
                  <span>→</span>
                </button>
              </Magnetic>
            )}
          </div>

        </motion.div>

      </div>
    </motion.div>
  );
}