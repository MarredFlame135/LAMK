// src/components/admin/InventoryManager.tsx
//
// Gestión rápida de inventario (RF-3.2):
//  - Subir Nuevo Artículo: imagen pasa por el pipeline de tratamiento IA
//    (api/image-pipeline) y se guarda como borrador local — publicarlo en
//    Shopify de verdad requiere el scope write_products de la Admin API,
//    que este proyecto aún no tiene, así que no se finge esa escritura.
//  - Activo/Desactivado: oculta un producto real del catálogo PWA con un
//    toque, sin borrar ni tocar nada en Shopify (data/hidden-products.json).

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Product } from '@/types/product';
import { ProductDraft } from '@/lib/inventory-store';
import { CATEGORY_LABELS } from '@/lib/catalog';

const CATEGORY_OPTIONS: Product['category'][] = ['SNEAKERS', 'APPAREL', 'ACCESSORIES', 'COLLECTIBLES', 'JEWELRY'];
const EMPTY_FORM = { title: '', brand: '', category: 'SNEAKERS' as Product['category'], price: '', sizeOptions: '', description: '' };

export function InventoryManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<ProductDraft[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState<{ dataUrl: string; processedUrl: string } | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadInventory = () => {
    fetch('/api/admin/inventory').then((r) => r.json()).then((d) => {
      setProducts(d.products || []);
      setHidden(new Set(d.hidden || []));
    });
  };
  const loadDrafts = () => {
    fetch('/api/admin/product-drafts').then((r) => r.json()).then((d) => setDrafts(d.drafts || []));
  };

  useEffect(() => { loadInventory(); loadDrafts(); }, []);

  const toggleHidden = async (productId: string, nextHidden: boolean) => {
    setHidden((prev) => {
      const next = new Set(prev);
      nextHidden ? next.add(productId) : next.delete(productId);
      return next;
    });
    await fetch('/api/admin/hidden-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, hidden: nextHidden }),
    });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setIsProcessingImage(true);
      try {
        const res = await fetch('/api/image-pipeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: dataUrl, backgroundTheme: 'DARK_ASPHALT' }),
        });
        const data = await res.json();
        setImageFile({ dataUrl, processedUrl: data.processedUrl || dataUrl });
      } catch (err) {
        console.error('Error en pipeline de imagen:', err);
        setImageFile({ dataUrl, processedUrl: dataUrl });
      } finally {
        setIsProcessingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) return;
    setIsSaving(true);
    try {
      await fetch('/api/admin/product-drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          brand: form.brand,
          category: form.category,
          price: parseFloat(form.price) || 0,
          sizeOptions: form.sizeOptions,
          description: form.description,
          imageUrl: imageFile.processedUrl,
        }),
      });
      setForm(EMPTY_FORM);
      setImageFile(null);
      loadDrafts();
    } finally {
      setIsSaving(false);
    }
  };

  // Fix (hallazgo #5 de la auditoría de Fase 6): antes borraba apenas se
  // hacía clic, sin ninguna confirmación — el único botón destructivo del
  // panel de admin sin ese resguardo.
  const handleDeleteDraft = async (id: string) => {
    if (!window.confirm('¿Quitar este borrador? No se puede deshacer.')) return;
    await fetch('/api/admin/product-drafts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    loadDrafts();
  };

  return (
    <div className="space-y-6">
      <h3 className="font-display text-sm font-black uppercase tracking-wider text-zinc-100">GESTIÓN DE INVENTARIO</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Subir Nuevo Artículo */}
        <div className="p-5 bg-card border border-border rounded-xl shadow-lg shadow-black/20 space-y-3">
          <h4 className="font-display text-xs font-black uppercase tracking-wide text-foreground">Subir Nuevo Artículo</h4>
          <form onSubmit={handleSaveDraft} className="space-y-3 text-xs">
            <label className="flex flex-col items-center justify-center gap-2 h-32 border border-dashed border-border rounded-lg cursor-pointer hover:border-red-600/60 transition overflow-hidden relative">
              {imageFile ? (
                <Image src={imageFile.processedUrl} alt="preview" fill sizes="200px" className="object-cover" />
              ) : (
                <span className="text-muted-foreground">{isProcessingImage ? 'Procesando con IA...' : '📸 Toca para subir foto'}</span>
              )}
              <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            </label>

            <input required placeholder="Título del producto" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded text-foreground" />
            <div className="grid grid-cols-2 gap-2">
              <input required placeholder="Marca" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded text-foreground" />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Product['category'] })} className="w-full p-2.5 bg-muted border border-border rounded text-foreground">
                {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input required type="number" placeholder="Precio MXN" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded text-foreground" />
              <input placeholder="Tallas (ej. 26,27,28)" value={form.sizeOptions} onChange={(e) => setForm({ ...form, sizeOptions: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded text-foreground" />
            </div>
            <textarea placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full p-2.5 bg-muted border border-border rounded text-foreground" rows={2} />

            <button type="submit" disabled={!imageFile || isSaving} className="w-full py-2.5 min-h-[44px] bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-bold uppercase rounded transition">
              {isSaving ? 'Guardando...' : 'Guardar Borrador'}
            </button>
            <p className="text-[10px] text-muted-foreground">Se guarda localmente. Publicarlo en Shopify requiere activar el scope write_products de la Admin API.</p>
          </form>

          {drafts.length > 0 && (
            <div className="pt-3 border-t border-border space-y-2">
              <p className="text-[10px] font-mono text-muted-foreground uppercase">Borradores pendientes de publicar ({drafts.length})</p>
              {drafts.map((d) => (
                <div key={d.id} className="flex items-center gap-2 p-2 bg-muted border border-border rounded">
                  <div className="relative w-8 h-8 rounded bg-black overflow-hidden shrink-0">
                    <Image src={d.imageUrl} alt={d.title} fill sizes="32px" className="object-cover" />
                  </div>
                  <span className="flex-1 truncate text-foreground">{d.title}</span>
                  <button onClick={() => handleDeleteDraft(d.id)} className="text-muted-foreground hover:text-red-400 text-[10px] uppercase font-bold">Quitar</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Gestión / Dar de Baja */}
        <div className="p-5 bg-card border border-border rounded-xl shadow-lg shadow-black/20 space-y-3">
          <h4 className="font-display text-xs font-black uppercase tracking-wide text-foreground">Gestión de Catálogo ({products.length} artículos)</h4>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {products.map((p) => {
              const isHidden = hidden.has(p.id);
              return (
                <div key={p.id} className="flex items-center gap-3 p-2 bg-muted border border-border rounded text-xs">
                  <div className="relative w-9 h-9 rounded bg-black overflow-hidden shrink-0">
                    <Image src={p.images[0]} alt={p.title} fill sizes="36px" className="object-cover" />
                  </div>
                  <span className="flex-1 truncate text-foreground">{p.title}</span>
                  <button
                    onClick={() => toggleHidden(p.id, !isHidden)}
                    className={`px-3 py-1.5 min-h-[32px] rounded-full text-[10px] font-bold uppercase transition ${
                      isHidden ? 'bg-zinc-800 text-muted-foreground' : 'bg-emerald-950 text-emerald-400'
                    }`}
                  >
                    {isHidden ? 'DESACTIVADO' : 'ACTIVO'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
