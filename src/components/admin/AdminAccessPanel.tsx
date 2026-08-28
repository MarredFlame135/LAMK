// src/components/admin/AdminAccessPanel.tsx
//
// Quién puede entrar al panel de admin, y cómo agregar a alguien más. No es
// un formulario que "otorga" el permiso en un clic — ver la nota grande de
// admin-access.ts sobre por qué (el filesystem de Vercel no es confiable
// para persistir esto). En su lugar, muestra el estado real y deja clarísimo
// el paso siguiente para agregar a alguien.

'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fadeUp } from '@/lib/motion';

interface AccessData {
  rootAdmin: string;
  allowlisted: string[];
}

export function AdminAccessPanel() {
  const [data, setData] = useState<AccessData | null>(null);
  const [copied, setCopied] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    fetch('/api/admin/access')
      .then((res) => res.json())
      .then(setData)
      .catch((err) => console.error('No se pudo cargar el panel de accesos:', err));
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(newEmail.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div variants={fadeUp} className="bg-card border border-border rounded-2xl p-6 space-y-5">
      <div>
        <span className="text-xs font-mono text-[#FF1E42] uppercase tracking-widest">// Accesos de administrador</span>
        <h2 className="font-display text-xl font-black uppercase tracking-tight mt-1">Quién puede entrar aquí</h2>
      </div>

      {data ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-zinc-900/60 border border-border rounded-lg">
            <div>
              <p className="text-xs font-bold text-zinc-200">{data.rootAdmin || '—'}</p>
              <p className="text-[10px] text-zinc-400">Admin raíz — credencial fija (ADMIN_EMAIL/ADMIN_PASSWORD)</p>
            </div>
            <span className="text-[9px] font-mono uppercase px-2 py-1 bg-[#FF1E42]/15 text-[#FF1E42] rounded-full">Raíz</span>
          </div>

          {data.allowlisted.length === 0 ? (
            <p className="text-xs text-zinc-400 px-1">Nadie más tiene acceso otorgado todavía.</p>
          ) : (
            data.allowlisted.map((email) => (
              <div key={email} className="flex items-center justify-between p-3 bg-zinc-900/60 border border-border rounded-lg">
                <div>
                  <p className="text-xs font-bold text-zinc-200">{email}</p>
                  <p className="text-[10px] text-zinc-400">Entra con su cuenta de cliente normal</p>
                </div>
                <span className="text-[9px] font-mono uppercase px-2 py-1 bg-emerald-950/40 text-emerald-400 rounded-full">Otorgado</span>
              </div>
            ))
          )}
        </div>
      ) : (
        <p className="text-xs text-zinc-400">Cargando...</p>
      )}

      <div className="p-4 bg-zinc-900/60 border border-dashed border-zinc-700 rounded-lg space-y-3">
        <p className="text-xs font-bold text-zinc-200">Otorgar acceso a un correo nuevo</p>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Este correo debe tener <strong className="text-zinc-300">ya una cuenta de cliente</strong> en{' '}
          <a href="/auth/register" className="text-[#FF1E42] hover:underline">/auth/register</a> — el acceso de admin usa esa
          misma contraseña, no una nueva. Escribe el correo y copia el valor para agregarlo:
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            className="flex-1 p-2 bg-black border border-zinc-700 text-xs rounded text-white"
          />
          <button
            onClick={handleCopy}
            disabled={!newEmail.trim()}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white text-[10px] font-bold uppercase rounded transition"
          >
            {copied ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>
        <p className="text-[10px] text-zinc-400 leading-relaxed">
          Pídele a Claude que agregue este correo a la variable <code className="text-zinc-300">ADMIN_EMAILS</code> en Vercel
          (Production) — es un cambio de configuración con acceso de dueño, no algo que este formulario deba poder hacer solo.
          Si varios correos ya están otorgados, sepáralos con comas en esa misma variable.
        </p>
      </div>
    </motion.div>
  );
}
