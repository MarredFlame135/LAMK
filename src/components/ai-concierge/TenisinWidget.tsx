// src/components/ai-concierge/TenisinWidget.tsx

'use client';

import React, { useState } from 'react';
import { SAAS_CONFIG } from '@/lib/saas-config';

type MascotState = 'idle' | 'thinking' | 'happy' | 'notFound';

export function TenisinWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [mascotState, setMascotState] = useState<MascotState>('idle');
  const [messages, setMessages] = useState([
    { sender: 'TENISIN', text: SAAS_CONFIG.mascotGreeting },
  ]);
  const [inputMessage, setInputMessage] = useState('');

  // Lógica para cambiar la pose de TENISIN combinada con las animaciones
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage;
    setMessages((prev) => [...prev, { sender: 'USER', text: userText }]);
    setInputMessage('');
    
    // 1. Cambia pose a "Buscando / Pensando"
    setMascotState('thinking');

    // 2. Simula búsqueda en Shopify GraphQL
    setTimeout(() => {
      // 3. Cambia pose a "Feliz / Encontrado"
      setMascotState('happy');
      setMessages((prev) => [
        ...prev,
        {
          sender: 'TENISIN',
          text: `👟 ¡Excelente búsqueda! Consulté nuestro inventario en tiempo real. Si la talla está disponible puedes pedirla al instante; si no, puedo anotarte a la lista VIP o sugerirte pares de la misma categoría.`,
        },
      ]);

      // Vuelve a reposo después de 4 segundos
      setTimeout(() => setMascotState('idle'), 4000);
    }, 1200);
  };

  // Obtener la ruta de la imagen según la pose actual
  const currentMascotImage = SAAS_CONFIG.mascotPoses[mascotState] || SAAS_CONFIG.mascotPoses.idle;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* Ventana de Chat Abierta de TENISIN */}
      {isOpen && (
        <div className="mb-4 w-80 sm:w-96 bg-[#0A0A0C] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-[#F4F4F0] flex flex-col h-96 transition-all animate-pop">
          
          {/* Header de TENISIN */}
          <div className="p-4 bg-gradient-to-r from-red-900/60 to-black border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center overflow-hidden tenisin-glow">
                <img
                  src={currentMascotImage}
                  alt={SAAS_CONFIG.mascotName}
                  className="w-full h-full object-contain animate-float"
                  onError={(e) => {
                    // Fallback si la imagen aún no existe en public
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div>
                <h3 className="font-black text-sm uppercase tracking-wide">{SAAS_CONFIG.mascotName}</h3>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {mascotState === 'thinking' ? 'BUSCANDO EN SHOPIFY...' : 'ASISTENTE IA EN VIVO'}
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
              <div
                key={idx}
                className={`flex ${m.sender === 'USER' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-xl ${
                    m.sender === 'USER'
                      ? 'bg-[#E60026] text-white rounded-tr-none font-medium'
                      : 'bg-[#121215] border border-zinc-800 text-zinc-200 rounded-tl-none'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Formulario de envío */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-800 bg-[#121215] flex gap-2">
            <input
              type="text"
              placeholder="Pregúntale a TENISIN por un par..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              className="flex-1 p-2 bg-black border border-zinc-800 rounded-lg text-xs text-white outline-none focus:border-red-600 font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#E60026] hover:bg-red-700 text-white font-bold text-xs uppercase rounded-lg transition"
            >
              ENVIAR
            </button>
          </form>

        </div>
      )}

      {/* Botón Flotante con Poses + Flotación CSS + Aura Neón */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-3 p-2 pr-4 bg-gradient-to-r from-[#0A0A0C] to-zinc-900 text-white rounded-full shadow-2xl hover:scale-105 transition-all duration-300 border border-zinc-800 hover:border-red-600/60"
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
      </button>

    </div>
  );
}