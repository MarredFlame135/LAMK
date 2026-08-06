// src/app/(routes)/onboarding/page.tsx
//
// Cuestionario gamificado post-registro (RF-03): captura talla, marcas
// favoritas y estilos. Se guarda en localStorage ligado al correo del
// cliente logueado (persistirlo como metafield real de Shopify requeriría
// escribir en la Admin API — confirmar aparte antes de tocar datos de producción).

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { UserPreferences } from '@/types/user';

const BRANDS = ['JORDAN', 'YEEZY', 'NEW BALANCE', 'ADIDAS', 'NIKE', 'FEAR OF GOD', 'SUPREME', 'UNIQLO'];
const STYLES = ['CASUAL', 'RUNNING', 'STREETWEAR', 'LUJO / DRESSY', 'RETRO', 'DEPORTIVO'];
const APPAREL_SIZES: UserPreferences['apparelSize'][] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((i) => i !== item) : [...list, item];
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [shoeSize, setShoeSize] = useState<number>(27);
  const [apparelSize, setApparelSize] = useState<UserPreferences['apparelSize']>('M');
  const [brands, setBrands] = useState<string[]>([]);
  const [styles, setStyles] = useState<string[]>([]);

  const steps = ['TALLA', 'MARCAS', 'ESTILO'];

  const finish = () => {
    const prefs: UserPreferences = {
      preferredBrands: brands,
      favoriteStyles: styles,
      shoeSize,
      shoeSizeSystem: 'MX',
      apparelSize,
    };

    if (user?.email) {
      localStorage.setItem(`lamk_prefs_${user.email}`, JSON.stringify(prefs));
    }
    router.push('/vault');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-[#0A0A0C] text-[#F4F4F0] px-4 py-12">
      <div className="w-full max-w-lg bg-[#121215] border border-zinc-800 rounded-2xl p-8 space-y-8">

        {/* Progreso */}
        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-mono text-zinc-500 uppercase">
            {steps.map((s, i) => (
              <span key={s} className={i <= step ? 'text-[#E60026] font-bold' : ''}>{s}</span>
            ))}
          </div>
          <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden">
            <motion.div
              className="bg-gradient-to-r from-red-600 to-[#E60026] h-full"
              animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              <h2 className="text-xl font-black uppercase">¿Cuál es tu talla?</h2>
              <div>
                <label className="block text-xs text-zinc-400 mb-2">Talla de calzado (MX)</label>
                <input
                  type="range"
                  min={20}
                  max={30}
                  step={0.5}
                  value={shoeSize}
                  onChange={(e) => setShoeSize(parseFloat(e.target.value))}
                  className="w-full accent-[#E60026]"
                />
                <p className="text-center text-2xl font-black text-[#E60026] mt-2">{shoeSize} MX</p>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-2">Talla de ropa</label>
                <div className="flex flex-wrap gap-2">
                  {APPAREL_SIZES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setApparelSize(s)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${
                        apparelSize === s ? 'bg-[#E60026] border-[#E60026] text-white' : 'bg-black border-zinc-800 text-zinc-400'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <h2 className="text-xl font-black uppercase">¿Qué marcas te laten?</h2>
              <p className="text-xs text-zinc-500">Elige todas las que quieras.</p>
              <div className="flex flex-wrap gap-2">
                {BRANDS.map((b) => (
                  <button
                    key={b}
                    onClick={() => setBrands(toggle(brands, b))}
                    className={`px-4 py-2 rounded-full text-xs font-bold border transition ${
                      brands.includes(b) ? 'bg-[#E60026] border-[#E60026] text-white' : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <h2 className="text-xl font-black uppercase">¿Cuál es tu estilo?</h2>
              <p className="text-xs text-zinc-500">Esto nos ayuda a que TENISIN te recomiende mejor.</p>
              <div className="flex flex-wrap gap-2">
                {STYLES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStyles(toggle(styles, s))}
                    className={`px-4 py-2 rounded-full text-xs font-bold border transition ${
                      styles.includes(s) ? 'bg-[#E60026] border-[#E60026] text-white' : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between pt-2">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="px-5 py-2.5 text-xs font-bold uppercase text-zinc-400 hover:text-white">
              Atrás
            </button>
          ) : (
            <button onClick={() => router.push('/vault')} className="px-5 py-2.5 text-xs font-bold uppercase text-zinc-600 hover:text-zinc-400">
              Omitir
            </button>
          )}

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-6 py-2.5 bg-[#E60026] hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest rounded-lg transition"
            >
              Siguiente →
            </button>
          ) : (
            <button
              onClick={finish}
              className="px-6 py-2.5 bg-[#E60026] hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest rounded-lg transition"
            >
              Entrar al Club 🔥
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
