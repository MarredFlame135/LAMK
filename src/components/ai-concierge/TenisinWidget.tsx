// src/components/ai-concierge/TenisinWidget.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { SAAS_CONFIG } from '@/lib/saas-config';
import { searchCatalog, getCatalog } from '@/lib/catalog';
import { logDemandRequest, updateDemandRequest } from '@/hooks/useLeads';
import { logLayawayRequest } from '@/hooks/useLayaway';
import { haptics } from '@/lib/haptics';
import { Product } from '@/types/product';

type MascotState = 'idle' | 'thinking' | 'happy' | 'notFound';
type CategoryKey = 'SNEAKERS' | 'APPAREL' | 'GORRAS' | 'BOLSOS' | 'PELUCHES';

interface ChatOption {
  label: string;
  onClick: () => void;
}

interface ChatMessage {
  sender: 'TENISIN' | 'USER';
  text: string;
  products?: Product[];
  options?: ChatOption[];
  resultsSizeLabel?: string; // talla en contexto cuando `products` viene de una búsqueda, para el botón "Apartar"
}

const PHONE_REGEX = /\b\d{10}\b/;

// Estado del flujo guiado de apartado ("layaway") que arranca TENISIN cuando
// el cliente toca "📌 Apartar" en una tarjeta de producto.
interface LayawayDraft {
  product: Product;
  sizeLabel?: string;
  percentage: number;
  depositAmount: number;
  phone?: string;
}

// Interpreta lo que el cliente escribe cuando elige "OTRO MONTO": acepta un
// porcentaje ("40%", "40") o un monto directo en pesos ("$3000", "3000").
function parseCustomDeposit(text: string, price: number): { percentage: number; depositAmount: number } | null {
  const pctMatch = text.match(/(\d{1,3}(?:\.\d+)?)\s*%/);
  if (pctMatch) {
    const percentage = Math.min(100, Math.max(1, parseFloat(pctMatch[1])));
    return { percentage, depositAmount: Math.round((price * percentage) / 100) };
  }
  const amountMatch = text.match(/\$?\s*(\d{2,7}(?:\.\d+)?)/);
  if (amountMatch) {
    const depositAmount = Math.round(Math.min(price, Math.max(1, parseFloat(amountMatch[1]))));
    const percentage = Math.round((depositAmount / price) * 100);
    return { percentage, depositAmount };
  }
  return null;
}

const CATEGORY_OPTIONS: { key: CategoryKey; label: string }[] = [
  { key: 'SNEAKERS', label: '👟 SNEAKERS' },
  { key: 'APPAREL', label: '👕 ROPA / APPAREL' },
  { key: 'GORRAS', label: '🧢 GORRAS' },
  { key: 'BOLSOS', label: '👜 BOLSOS' },
  { key: 'PELUCHES', label: '🧸 PELUCHES' },
];

function matchCategory(key: CategoryKey, catalog: Product[]): Product[] {
  switch (key) {
    case 'SNEAKERS': return catalog.filter((p) => p.category === 'SNEAKERS');
    case 'APPAREL': return catalog.filter((p) => p.category === 'APPAREL');
    case 'GORRAS': return catalog.filter((p) => p.category === 'ACCESSORIES' && /gorra|cap\b/i.test(p.title));
    case 'BOLSOS': return catalog.filter((p) => p.category === 'ACCESSORIES' && /bolso|bag|mini/i.test(p.title));
    case 'PELUCHES': return catalog.filter((p) => p.category === 'COLLECTIBLES');
  }
}

const inStock = (p: Product) => !p.isSoldOut && p.variants.some((v) => v.isAvailable);
const getProductPrice = (p: Product) => p.variants.find((v) => v.isAvailable)?.price ?? p.variants[0]?.price ?? 0;

export function TenisinWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [mascotState, setMascotState] = useState<MascotState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [awaitingOtherQuery, setAwaitingOtherQuery] = useState(false);
  // Cuando una búsqueda no encuentra nada disponible, guardamos el id del lead
  // pendiente para completarlo con el WhatsApp en cuanto el cliente lo escriba.
  const [pendingLeadId, setPendingLeadId] = useState<string | null>(null);
  // Flujo de apartado en curso: qué producto/%/monto ya se eligió, y en qué
  // paso está (esperando WhatsApp o esperando el comentario opcional).
  const [layawayDraft, setLayawayDraft] = useState<LayawayDraft | null>(null);
  const [layawayStep, setLayawayStep] = useState<'custom_amount' | 'phone' | 'note' | null>(null);
  // Catálogo real de Shopify (con fallback a mock) cargado una vez al montar.
  const catalogRef = useRef<Product[]>(getCatalog());
  const hasGreeted = useRef(false);

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

  const respond = (text: string, extra?: { products?: Product[]; options?: ChatOption[]; resultsSizeLabel?: string }) => {
    setMessages((prev) => [...prev, { sender: 'TENISIN', text, ...extra }]);
  };
  const say = (text: string) => setMessages((prev) => [...prev, { sender: 'USER', text }]);

  // Saludo + árbol de selección guiado al abrir el chat por primera vez
  useEffect(() => {
    if (isOpen && !hasGreeted.current) {
      hasGreeted.current = true;
      setMessages([
        { sender: 'TENISIN', text: '¡Hola! Soy TENISIN 👟, voy a ayudarte a encontrar lo que buscas.' },
      ]);
      setTimeout(() => showCategoryMenu(), 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const showCategoryMenu = () => {
    respond('¿Qué tipo de producto buscas?', {
      options: [
        ...CATEGORY_OPTIONS.map((c) => ({ label: c.label, onClick: () => handleCategoryClick(c.key, c.label) })),
        { label: '🔍 OTRO / PEDIDO ESPECIAL', onClick: () => handleOtherClick() },
      ],
    });
  };

  const notifyMeFlow = async (rawQuery: string, productId?: string, productTitle?: string) => {
    setMascotState('notFound');
    const lead = await logDemandRequest({
      productId: productId || 'N/A',
      productTitle: productTitle || rawQuery,
      rawQuery,
      wasMatched: false,
    });
    setPendingLeadId(lead.id);
    respond('Ya anoté tu búsqueda para que el equipo la revise antes de comprar más inventario. Si me dejas tu WhatsApp (10 dígitos) te aviso apenas esté disponible 📲');
  };

  const handleOtherClick = () => {
    haptics.tap();
    say('🔍 Otro / Pedido especial');
    respond('Perfecto, cuéntame: escribe el nombre del par o prenda que buscas y en el siguiente mensaje déjame tu WhatsApp para avisarte cuando lo consigamos.');
    setAwaitingOtherQuery(true);
  };

  const handleCategoryClick = (key: CategoryKey, label: string) => {
    haptics.tap();
    say(label);
    setMascotState('thinking');

    setTimeout(() => {
      const matches = matchCategory(key, catalogRef.current).filter(inStock);

      if (matches.length === 0) {
        respond(`Justo ahorita no tengo ${label.replace(/^\S+\s/, '').toLowerCase()} en inventario 😔`);
        notifyMeFlow(label);
        return;
      }

      setMascotState('idle');
      const brands = Array.from(new Set(matches.map((p) => p.brand))).slice(0, 8);

      if (brands.length <= 1) {
        showSizeOrResults(key, brands[0] || matches[0].brand, matches);
        return;
      }

      respond(`Tengo estas marcas disponibles en ${label.replace(/^\S+\s/, '')}:`, {
        options: brands.map((b) => ({ label: b, onClick: () => handleBrandClick(key, b, label) })),
      });
    }, 700);
  };

  const handleBrandClick = (key: CategoryKey, brand: string, categoryLabel: string) => {
    haptics.tap();
    say(brand);
    setMascotState('thinking');
    setTimeout(() => {
      const matches = matchCategory(key, catalogRef.current).filter((p) => p.brand === brand && inStock(p));
      showSizeOrResults(key, brand, matches, categoryLabel);
    }, 500);
  };

  const showSizeOrResults = (key: CategoryKey, brand: string, products: Product[], categoryLabel?: string) => {
    setMascotState('idle');
    if (products.length === 0) {
      notifyMeFlow(`${brand} ${categoryLabel || ''}`.trim());
      return;
    }

    const isSneaker = key === 'SNEAKERS';
    const sizeLabels = Array.from(new Set(
      products.flatMap((p) => p.variants.filter((v) => v.isAvailable).map((v) => isSneaker ? `${v.size.mx} MX` : (v.sizeLabel || '')))
    )).filter(Boolean).sort();

    if (sizeLabels.length <= 1) {
      showResults(products, `${brand} ${products[0].title}`, sizeLabels[0]);
      return;
    }

    respond(`¿Qué talla buscas de ${brand}?`, {
      options: sizeLabels.map((s) => ({ label: s, onClick: () => handleSizeClick(brand, s, isSneaker, products) })),
    });
  };

  const handleSizeClick = (brand: string, sizeLabel: string, isSneaker: boolean, products: Product[]) => {
    haptics.tap();
    say(sizeLabel);
    setMascotState('thinking');
    setTimeout(() => {
      const filtered = products.filter((p) =>
        p.variants.some((v) => v.isAvailable && (isSneaker ? `${v.size.mx} MX` === sizeLabel : v.sizeLabel === sizeLabel))
      );
      if (filtered.length === 0) {
        notifyMeFlow(`${brand} talla ${sizeLabel}`);
        return;
      }
      showResults(filtered, `${brand} talla ${sizeLabel}`, sizeLabel);
    }, 500);
  };

  const showResults = (products: Product[], rawQuery: string, sizeLabel?: string) => {
    setMascotState('happy');
    const top = products.slice(0, 3);
    logDemandRequest({ productId: top[0].id, productTitle: top[0].title, rawQuery, wasMatched: true });
    respond(`👟 ¡Encontré ${top.length === 1 ? 'un par' : `${top.length} opciones`}! Toca la tarjeta para ver detalle o apártalo con un %.`, { products: top, resultsSizeLabel: sizeLabel });
    setTimeout(() => setMascotState('idle'), 4000);
  };

  // Arranca el flujo de apartado para un producto puntual (botón "📌 Apartar"
  // en la tarjeta). Pregunta el % de anticipo con botones rápidos.
  const startLayawayFlow = (product: Product, sizeLabel?: string) => {
    haptics.tap();
    const price = getProductPrice(product);
    say(`📌 Quiero apartar: ${product.title}`);
    respond(`¡Va! Voy a apartarte tu ${product.title}. ¿Con qué porcentaje te gustaría apartar tu par? 👟`, {
      options: [
        { label: '20%', onClick: () => handleLayawayPercentClick(product, sizeLabel, price, 20) },
        { label: '30%', onClick: () => handleLayawayPercentClick(product, sizeLabel, price, 30) },
        { label: '50%', onClick: () => handleLayawayPercentClick(product, sizeLabel, price, 50) },
        { label: 'OTRO MONTO', onClick: () => handleLayawayCustomClick(product, sizeLabel, price) },
      ],
    });
  };

  const askForLayawayPhone = (product: Product, sizeLabel: string | undefined, percentage: number, depositAmount: number) => {
    setLayawayDraft({ product, sizeLabel, percentage, depositAmount });
    setLayawayStep('phone');
    respond(`Perfecto, tu anticipo del ${percentage}% es de $${depositAmount.toLocaleString()} MXN. Déjame tu WhatsApp (10 dígitos) para coordinar el apartado 📲`);
  };

  const handleLayawayPercentClick = (product: Product, sizeLabel: string | undefined, price: number, percentage: number) => {
    haptics.tap();
    say(`${percentage}%`);
    askForLayawayPhone(product, sizeLabel, percentage, Math.round((price * percentage) / 100));
  };

  const handleLayawayCustomClick = (product: Product, sizeLabel: string | undefined, price: number) => {
    haptics.tap();
    say('OTRO MONTO');
    setLayawayDraft({ product, sizeLabel, percentage: 0, depositAmount: 0 });
    setLayawayStep('custom_amount');
    respond(`Ok, escribe el % o el monto en pesos que quieres apartar (ej. "40%" o "$3000") de un total de $${price.toLocaleString()} MXN.`);
  };

  const runFreeformSearch = async (query: string) => {
    const catalog = catalogRef.current;
    const results = searchCatalog(query, catalog).filter(inStock);

    if (results.length > 0) {
      showResults(results, query);
      return;
    }

    const anyMatch = searchCatalog(query, catalog);
    setMascotState('notFound');
    const lead = await logDemandRequest({
      productId: anyMatch[0]?.id || 'N/A',
      productTitle: anyMatch[0]?.title || query,
      rawQuery: query,
      wasMatched: false,
    });
    setPendingLeadId(lead.id);
    respond('🤔 No encontré nada con eso todavía. Ya le avisé al equipo de tu búsqueda. Si me dejas tu WhatsApp (10 dígitos) te aviso en cuanto entre.');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage.trim();
    setMessages((prev) => [...prev, { sender: 'USER', text: userText }]);
    setInputMessage('');

    // Flujo de apartado en curso: tiene prioridad sobre cualquier otro paso
    // porque el cliente ya eligió un producto puntual para reservar.
    if (layawayStep === 'custom_amount' && layawayDraft) {
      const price = getProductPrice(layawayDraft.product);
      const parsed = parseCustomDeposit(userText, price);
      if (!parsed) {
        respond('No te entendí ese monto 🤔 Escribe algo como "40%" o "$3000".');
        return;
      }
      askForLayawayPhone(layawayDraft.product, layawayDraft.sizeLabel, parsed.percentage, parsed.depositAmount);
      return;
    }

    if (layawayStep === 'phone' && layawayDraft) {
      const phoneMatch = userText.match(PHONE_REGEX);
      if (!phoneMatch) {
        respond('Ese número no me cuadra 📵 Mándame tu WhatsApp a 10 dígitos, por favor.');
        return;
      }
      setLayawayDraft({ ...layawayDraft, phone: phoneMatch[0] });
      setLayawayStep('note');
      respond('¿Algún comentario para tu apartado? (color, fecha en que pasas a pagar, etc.) Escribe "no" si no tienes ninguno.');
      return;
    }

    if (layawayStep === 'note' && layawayDraft) {
      const note = /^no$/i.test(userText) ? '' : userText;
      const phone = layawayDraft.phone || '';
      const { product, sizeLabel, percentage, depositAmount } = layawayDraft;
      logLayawayRequest({
        productId: product.id,
        productTitle: product.title,
        productImage: product.images[0] || '',
        requestedSize: sizeLabel,
        totalPrice: getProductPrice(product),
        percentage,
        depositAmount,
        hypeScore: product.hypeMeter?.score,
        customerPhone: phone,
        note,
      });
      setLayawayDraft(null);
      setLayawayStep(null);
      setMascotState('happy');
      haptics.success();
      respond(`Confirmado. Apartaste tu ${product.title} con un ${percentage}% ($${depositAmount.toLocaleString()} MXN). Nuestro equipo te escribe por WhatsApp para confirmar y coordinar el resto del pago.`);
      setTimeout(() => setMascotState('idle'), 3000);
      return;
    }

    // Paso 1 del flujo "OTRO": el texto libre es el nombre del artículo buscado
    if (awaitingOtherQuery) {
      setAwaitingOtherQuery(false);
      logDemandRequest({
        productId: 'N/A',
        productTitle: userText,
        rawQuery: userText,
        wasMatched: false,
      }).then((lead) => setPendingLeadId(lead.id));
      respond(`Anotado: "${userText}". Ahora déjame tu WhatsApp (10 dígitos) para avisarte en cuanto lo consigamos 📲`);
      return;
    }

    // Si estábamos esperando un WhatsApp para notificar restock, priorizamos eso
    const phoneMatch = userText.match(PHONE_REGEX);
    if (pendingLeadId && phoneMatch) {
      updateDemandRequest(pendingLeadId, { customerPhone: phoneMatch[0] });
      setPendingLeadId(null);
      setMascotState('happy');
      haptics.success();
      respond(`✅ ¡Listo! Guardé tu WhatsApp ${phoneMatch[0]} — te escribimos en cuanto haya disponibilidad.`);
      setTimeout(() => setMascotState('idle'), 3000);
      return;
    }

    setMascotState('thinking');
    setTimeout(() => runFreeformSearch(userText), 900);
  };

  // Obtener la ruta de la imagen según la pose actual
  const currentMascotImage = SAAS_CONFIG.mascotPoses[mascotState] || SAAS_CONFIG.mascotPoses.idle;

  return (
    <>
      {/* Ventana de Chat: bottom sheet full-width en mobile, panel flotante en sm+ */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm sm:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed inset-x-0 bottom-0 z-50 w-full h-[75vh] rounded-t-3xl sm:inset-x-auto sm:bottom-24 sm:right-6 sm:w-96 sm:h-[30rem] sm:rounded-2xl bg-[#0B0C0F]/97 backdrop-blur-md border border-zinc-800 shadow-2xl overflow-hidden text-zinc-100 flex flex-col"
            >

            {/* Header de TENISIN */}
            <div className="p-4 bg-gradient-to-r from-red-900/60 to-black border-b border-border flex items-center justify-between">
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
                className="text-zinc-400 hover:text-white font-bold text-lg px-2 min-w-[44px] min-h-[44px]"
              >
                ✕
              </button>
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
                        ? 'bg-[#FF1E42] text-white rounded-tr-none font-medium'
                        : 'bg-[#16161B] border border-zinc-800 text-zinc-100 rounded-tl-none'
                    }`}
                  >
                    {m.text}
                  </div>

                  {/* Botones de opciones (árbol guiado) */}
                  {m.options && (
                    <div className="mt-2 w-full flex flex-wrap gap-1.5">
                      {m.options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={opt.onClick}
                          className="px-3 py-2 min-h-[36px] bg-[#16161B] border border-zinc-700 hover:border-red-600/60 hover:bg-red-950/20 rounded-lg text-[11px] font-bold text-zinc-100 transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tarjetas de producto sugeridas por TENISIN */}
                  {m.products && (
                    <div className="mt-2 w-[85%] space-y-2">
                      {m.products.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 p-2 bg-[#16161B] border border-zinc-800 rounded-lg">
                          <motion.a
                            href={`/product/${p.handle}`}
                            whileHover={{ x: 3 }}
                            className="flex items-center gap-2 flex-1 min-w-0"
                          >
                            <div className="relative w-10 h-10 rounded bg-black overflow-hidden shrink-0">
                              <Image src={p.images[0]} alt={p.title} fill sizes="40px" className="object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold uppercase truncate">{p.title}</p>
                              <p className="text-[10px] text-[#FF1E42] font-mono">${p.variants[0]?.price.toLocaleString()} MXN</p>
                            </div>
                          </motion.a>
                          <button
                            onClick={() => startLayawayFlow(p, m.resultsSizeLabel)}
                            className="shrink-0 px-2 py-2 min-h-[36px] bg-black border border-zinc-700 hover:border-red-600/60 hover:bg-red-950/20 rounded-md text-[10px] font-bold text-zinc-100 transition-colors"
                          >
                            📌 Apartar
                          </button>
                        </div>
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
                  className="flex items-center gap-1 p-3 w-fit bg-[#16161B] border border-zinc-800 rounded-xl rounded-tl-none"
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
            <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 bg-[#0B0C0F] flex gap-2">
              <input
                type="text"
                placeholder={
                  layawayStep === 'custom_amount' ? 'Ej. 40% o $3000...'
                  : layawayStep === 'phone' ? 'Tu WhatsApp a 10 dígitos...'
                  : layawayStep === 'note' ? 'Comentario (o "no")...'
                  : pendingLeadId ? 'Tu WhatsApp a 10 dígitos...'
                  : awaitingOtherQuery ? 'Nombre del par o prenda...'
                  : 'O escríbele directo a TENISIN...'
                }
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 p-2.5 min-h-[44px] bg-black border border-border rounded-lg text-xs text-white outline-none focus:border-red-600 font-mono"
              />
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                type="submit"
                className="px-4 py-2 min-h-[44px] bg-[#FF1E42] hover:bg-red-700 text-white font-bold text-xs uppercase rounded-lg transition-colors"
              >
                ENVIAR
              </motion.button>
            </form>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Botón Flotante con Poses + Flotación CSS + Aura Neón */}
      <div className="fixed bottom-6 right-6 z-30">
        <motion.button
          onClick={() => { haptics.tap(); setIsOpen(!isOpen); }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="group relative flex items-center gap-3 p-2 pr-4 min-h-[48px] bg-gradient-to-r from-[#050507] to-zinc-900 text-white rounded-full shadow-2xl border border-border hover:border-red-600/60 transition-colors"
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

          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-[#FF1E42] rounded-full border-2 border-black animate-ping" />
        </motion.button>
      </div>
    </>
  );
}
