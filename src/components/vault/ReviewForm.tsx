// src/components/vault/ReviewForm.tsx
//
// Solo visible para clientes con al menos un pedido real (gate server-side
// también aplicado en /api/reviews). Foto "on-feet" opcional.

'use client';

import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { haptics } from '@/lib/haptics';

export function ReviewForm() {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, text, photoUrl: photo || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo enviar tu reseña.');
        return;
      }
      haptics.success();
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-5 bg-emerald-950/30 border border-emerald-800 rounded-xl text-center text-sm text-emerald-400">
        VERIFIED · ¡Gracias! Tu reseña ya está en LAMK.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 bg-card border border-border rounded-xl space-y-3">
      <h3 className="text-xs font-mono uppercase text-zinc-400 tracking-wider">// DEJA TU RESEÑA VERIFICADA</h3>

      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} className="p-1 min-w-[32px] min-h-[32px]">
            <Star className={`h-5 w-5 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}`} />
          </button>
        ))}
      </div>

      <textarea
        required
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Cuéntanos qué te pareció tu par..."
        rows={3}
        className="w-full p-3 bg-black border border-border rounded-lg text-xs text-white outline-none focus:border-[#FF1E42]"
      />

      <label className="flex items-center justify-center gap-2 h-20 border border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-red-600/60 transition text-[11px] text-zinc-500 overflow-hidden relative">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          '📸 Foto on-feet (opcional)'
        )}
        <input type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
      </label>

      {error && <p className="text-[11px] text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 min-h-[44px] bg-[#FF1E42] hover:bg-red-700 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-widest rounded-lg transition"
      >
        {isSubmitting ? 'ENVIANDO...' : 'PUBLICAR RESEÑA'}
      </button>
    </form>
  );
}
