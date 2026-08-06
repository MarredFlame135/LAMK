// src/components/ai-concierge/TenisinWidget.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SAAS_CONFIG } from '@/lib/saas-config';
import { searchCatalog, getCatalog, CATEGORY_LABELS } from '@/lib/catalog';
import { logDemandRequest, updateDemandRequest } from '@/hooks/useLeads';
import { Product } from '@/types/product';

type MascotState = 'idle' | 'thinking' | 'happy' | 'notFound';

interface ChatMessage {
  sender: 'TENISIN' | 'USER';
  text: string;
  products?: Product[];
}

const PHONE_REGEX = /\b\d{10}\b/;

export function TenisinWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [mascotState, setMascotState] = useState<MascotState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'TENISIN', text: SAAS_CONFIG.mascotGreeting },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  // Cuando una búsqueda no encuentra nada disponible, guardamos el id del lead
  // pendiente para completarlo con el WhatsApp en cuanto el cliente lo escriba.
  const [pendingLeadId, setPendingLeadId] = useState<string | null>(null);
  // Catálogo real de Shopify (con fallback a mock) cargado una vez al montar.
  const catalogRef = useRef<Product[]>(getCatalog());

  useEffect(() => {
    fetch('/api/catalog')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.products) && data.products.length > 0) {
          catalogRef.current = data.products;
        }
      })
      .catch((err) => console.error('TENISIN: no se pudo cargar el catálogo real, usando mock:', err));
  }, []);

  const respond = (text: string, products?: Product[]) => {
    setMessages((prev) => [...prev, { sender: 'TENISIN', text, products }]);
  };

  const runSearch = (query: string) => {
    const catalog = catalogRef.current;
    const results = searchCatalog(query, catalog).filter((p) => !p.isSoldOut && p.variants.some((v) => v.isAvailable));

    if (results.length > 0) {
      setMascotState('happy');
      const top = results.slice(0, 3);
      logDemandRequest({
        productId: top[0].id,
        productTitle: top[0].title,
        rawQuery: query,
        wasMatched: true,
      });
      respond(
        `👟 ¡Encontré ${results.length === 1 ? 'un par' : `${results.length} opciones`} en inventario! Toca la tarjeta para ver tallas y agregar al carrito.`,
        top
      );
      setTimeout(() => setMascotState('idle'), 4000);
      return;
    }

    // Sin resultado disponible: buscamos alternativas de la misma categoría/marca
    // entre TODO el catálogo (incluyendo agotados) para sugerir algo parecido.
    const anyMatch = searchCatalog(query, catalog);
    const fallbackCategory = anyMatch[0]?.category;
    const alternatives = searchCatalog(fallbackCategory ? CATEGORY_LABELS[fallbackCategory] : query, catalog)
      .filter((p) => !p.isSoldOut)
      .slice(0, 3);

    setMascotState('notFound');
    const lead = logDemandRequest({
      productId: anyMatch[0]?.id || 'N/A',
      productTitle: anyMatch[0]?.title || query,
      rawQuery: query,
      wasMatched: false,
    });
    setPendingLeadId(lead.id);

    respond(
      anyMatch.length > 0
        ? `😢 Justo ese par está agotado o sin talla disponible. Ya anoté tu búsqueda para que el equipo la revise. Mientras tanto, aquí tienes algo similar — y si me dejas tu WhatsApp (10 dígitos) te aviso apenas vuelva.`
        : `🤔 No encontré nada con eso en el catálogo todavía. Ya le avisé al equipo de tu búsqueda para que la considere en el próximo drop. Si me dejas tu WhatsApp (10 dígitos) te aviso en cuanto entre.`,
      alternatives.length > 0 ? alternatives : undefined
    );
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage.trim();
    setMessages((prev) => [...prev, { sender: 'USER', text: userText }]);
    setInputMessage('');

    // Si estábamos esperando un WhatsApp para notificar restock, priorizamos eso
    const phoneMatch = userText.match(PHONE_REGEX);
    if (pendingLeadId && phoneMatch) {
      updateDemandRequest(pendingLeadId, { customerPhone: phoneMatch[0] });
      setPendingLeadId(null);
      setMascotState('happy');
      respond(`✅ ¡Listo! Guardé tu WhatsApp ${phoneMatch[0]} — te escribimos en cuanto haya disponibilidad.`);
      setTimeout(() => setMascotState('idle'), 3000);
      return;
    }

    setMascotState('thinking');
    setTimeout(() => runSearch(userText), 900);
  };

  // Obtener la ruta de la imagen según la pose actual
  const currentMascotImage = SAAS_CONFIG.mascotPoses[mascotState] || SAAS_CONFIG.mascotPoses.idle;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">

      {/* Ventana de Chat Abierta de TENISIN */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="mb-4 w-80 sm:w-96 bg-[#0A0A0C]/95 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-[#F4F4F0] flex flex-col h-[28rem]"
          >

            {/* Header de TENISIN */}
            <div className="p-4 bg-gradient-to-r from-red-900/60 to-black border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center overflow-hidden tenisin-glow">
                  <img
                    src={currentMascotImage}
                    alt={SAAS_CONFIG.mascotName}
                    className="w-full h-full object-contain animate-float"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-wide">{SAAS_CONFIG.mascotName}</h3>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    {mascotState === 'thinking' ? 'BUSCANDO EN INVENTARIO...' : 'ASISTENTE IA EN VIVO'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-400 hover:text-white font-bold text-lg px-2"
              >
                ✕
              </button>
            </div>

            {/* Banner explicativo animado */}
            <div className="p-3 bg-zinc-900/80 border-b border-zinc-800 text-[11px] text-zinc-300 flex items-center gap-2">
              <span>🎬</span>
              <p><strong>Club LAMK:</strong> Suma XP con cada compra y desbloquea el Rango LEGEND.</p>
            </div>

            {/* Conversación */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              {messages.map((m, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex flex-col ${m.sender === 'USER' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-xl ${
                      m.sender === 'USER'
                        ? 'bg-[#E60026] text-white rounded-tr-none font-medium'
                        : 'bg-[#121215] border border-zinc-800 text-zinc-200 rounded-tl-none'
                    }`}
                  >
                    {m.text}
                  </div>

                  {/* Tarjetas de producto sugeridas por TENISIN */}
                  {m.products && (
                    <div className="mt-2 w-[85%] space-y-2">
                      {m.products.map((p) => (
                        <motion.a
                          key={p.id}
                          href={`/product/${p.handle}`}
                          whileHover={{ x: 3, borderColor: 'rgba(230,0,38,0.6)' }}
                          className="flex items-center gap-2 p-2 bg-[#121215] border border-zinc-800 rounded-lg transition-colors"
                        >
                          <img src={p.images[0]} alt={p.title} className="w-10 h-10 object-cover rounded bg-black" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold uppercase truncate">{p.title}</p>
                            <p className="text-[10px] text-[#E60026] font-mono">${p.variants[0]?.price.toLocaleString()} MXN</p>
                          </div>
                        </motion.a>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Indicador de "escribiendo" mientras TENISIN busca en el catálogo */}
              {mascotState === 'thinking' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-1 p-3 w-fit bg-[#121215] border border-zinc-800 rounded-xl rounded-tl-none"
                >
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-zinc-500"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </motion.div>
              )}
            </div>

            {/* Formulario de envío */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 bg-[#121215] flex gap-2">
              <input
                type="text"
                placeholder={pendingLeadId ? 'Tu WhatsApp a 10 dígitos...' : 'Pregúntale a TENISIN por un par...'}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 p-2 bg-black border border-zinc-800 rounded-lg text-xs text-white outline-none focus:border-red-600 font-mono"
              />
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                type="submit"
                className="px-4 py-2 bg-[#E60026] hover:bg-red-700 text-white font-bold text-xs uppercase rounded-lg transition-colors"
              >
                ENVIAR
              </motion.button>
            </form>

          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón Flotante con Poses + Flotación CSS + Aura Neón */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="group relative flex items-center gap-3 p-2 pr-4 bg-gradient-to-r from-[#0A0A0C] to-zinc-900 text-white rounded-full shadow-2xl border border-zinc-800 hover:border-red-600/60 transition-colors"
      >
        <div className="relative w-12 h-12 flex items-center justify-center animate-float tenisin-glow">
          <img
            src={currentMascotImage}
            alt={SAAS_CONFIG.mascotName}
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        <div className="text-left hidden sm:block">
          <span className="block font-black text-xs uppercase tracking-wider text-white">
            {SAAS_CONFIG.mascotName}
          </span>
          <span className="block text-[9px] font-mono text-emerald-400">
            ● EN VIVO
          </span>
        </div>

        <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-[#E60026] rounded-full border-2 border-black animate-ping" />
      </motion.button>

    </div>
  );
}
