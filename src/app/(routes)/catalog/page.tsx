// src/app/(routes)/catalog/page.tsx

'use client';

import React, { useState } from 'react';
import { HypeMeter } from '@/components/hype-meter/HypeMeter';
import { useCart } from '@/hooks/useCart';

// Productos extraídos directamente de tu inventario CSV
const REAL_CSV_CATALOG = [
  {
    id: 'csv-1',
    handle: 'hoodie-bape-seoul-exclusive-camo-shark',
    title: 'HOODIE BAPE SEOUL EXCLUSIVE CAMO SHARK',
    brand: 'BAPE',
    category: 'ROPA',
    price: 15500,
    image: 'https://cdn.shopify.com/s/files/1/0776/8984/8114/files/26_205bc3c0-8181-49ae-8b46-b5ac52fd656e.png?v=1781933042',
    size: 'M',
    hypeScore: 98,
  },
  {
    id: 'csv-2',
    handle: 'hoodie-supreme-satin-applique-black',
    title: "HOODIE SUPREME SATIN APPLIQUE 'BLACK'",
    brand: 'SUPREME',
    category: 'ROPA',
    price: 8000,
    image: 'https://cdn.shopify.com/s/files/1/0776/8984/8114/files/24_4b814d58-aca7-4592-86c0-2ceb64117832.png?v=1782102027',
    size: 'L',
    hypeScore: 92,
  },
  {
    id: 'csv-3',
    handle: 'hoodie-sp5der-rhinestone-pink',
    title: 'HOODIE SP5DER RHINESTONE PINK',
    brand: 'SP5DER',
    category: 'ROPA',
    price: 9000,
    image: 'https://cdn.shopify.com/s/files/1/0776/8984/8114/files/24_f656e803-a20d-4356-95f8-b1f5c1b94971.png?v=1783829402',
    size: 'XL',
    hypeScore: 95,
  },
  {
    id: 'csv-4',
    handle: 'white-1dr-xs-iconic-mini-bag-in-matte-leather',
    title: 'WHITE 1DR XS-ICONIC MINI BAG DIESEL',
    brand: 'DIESEL',
    category: 'BOLSOS',
    price: 5000,
    image: 'https://cdn.shopify.com/s/files/1/0776/8984/8114/files/7B8EB3E6-8BEA-4460-A6C4-ACF06539EB6C.jpg?v=1784006585',
    size: 'XS',
    hypeScore: 89,
  },
  {
    id: 'csv-5',
    handle: 'peluche-pokemon-center-japon-charmander',
    title: "PELUCHE POKEMON CENTER JAPON 'CHARMANDER'",
    brand: 'POKEMON CENTER',
    category: 'PELUCHES',
    price: 1200,
    image: 'https://cdn.shopify.com/s/files/1/0776/8984/8114/files/15_6ef7c100-f2b7-448c-bca4-1b1412fdb9da.png?v=1782796167',
    size: 'ÚNICA',
    hypeScore: 85,
  },
  {
    id: 'csv-6',
    handle: 'baez-x-shifu-astrogengar-azul',
    title: 'BÁEZ X SHIFU ASTROGENGAR AZUL',
    brand: 'BÁEZ X SHIFU',
    category: 'GORRAS',
    price: 2800,
    image: 'https://cdn.shopify.com/s/files/1/0776/8984/8114/files/661D32B3-5BD3-4A3B-A618-5A6536B6D96E.jpg?v=1783909694',
    size: 'AJUSTABLE',
    hypeScore: 94,
  },
];

export default function CatalogPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const { addItem } = useCart();

  const filtered = selectedCategory === 'TODOS'
    ? REAL_CSV_CATALOG
    : REAL_CSV_CATALOG.filter((p) => p.category === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto p-6 bg-[#0A0A0C] text-[#F4F4F0] min-h-screen space-y-8">
      
      {/* Header Catálogo */}
      <div className="border-b border-zinc-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-mono text-[#E60026] uppercase">// DROPS & INVENTARIO REAL</span>
          <h1 className="text-3xl font-black uppercase tracking-tight mt-1">CATÁLOGO EXCLUSIVO</h1>
        </div>

        {/* Filtro por Categorías */}
        <div className="flex flex-wrap gap-2 text-xs font-bold font-mono">
          {['TODOS', 'ROPA', 'BOLSOS', 'GORRAS', 'PELUCHES'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg border transition ${
                selectedCategory === cat
                  ? 'bg-[#E60026] border-[#E60026] text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Productos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((product) => (
          <div
            key={product.id}
            className="bg-[#121215] border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between hover:border-red-600/50 transition group"
          >
            <div>
              <div className="relative aspect-square bg-black rounded-xl overflow-hidden mb-4">
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                  🔥 {product.hypeScore}% HYPE
                </span>
              </div>

              <span className="text-[10px] font-mono text-zinc-400 uppercase">{product.brand}</span>
              <h3 className="text-sm font-bold uppercase mt-0.5 line-clamp-1">{product.title}</h3>
              <p className="text-xs font-mono text-zinc-500 mt-1">Talla: {product.size}</p>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-base font-black text-[#E60026]">
                ${product.price.toLocaleString()} MXN
              </span>
              <button
                onClick={() =>
                  addItem(
                    product.title,
                    product.id,
                    product.image,
                    {
                      id: `${product.id}-var`,
                      sku: product.id,
                      price: product.price,
                      stock: 1,
                      isAvailable: true,
                      size: { mx: 27, usMen: 9, usWomen: 10.5, eu: 42.5, cm: 27 },
                    }
                  )
                }
                className="px-4 py-2 bg-[#E60026] hover:bg-red-700 text-white text-xs font-bold uppercase rounded-lg transition"
              >
                + CARRITO
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}