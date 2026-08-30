// src/app/(routes)/vault/scan/page.tsx
//
// Fase C.4: escáner integrado. BarcodeDetector nativo cuando existe
// (Chrome/Edge/Android — no Safari/iOS todavía), nunca una librería nueva
// como respaldo (el brief lo permite, pero la alternativa de "buscar por
// handle" ya cubre el caso sin cámara sin agregar peso al bundle).
// Permiso de cámara pedido CON CONTEXTO antes del prompt del navegador —
// un permiso pedido a secas se rechaza más.

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VaultScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handleInput, setHandleInput] = useState('');

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'BarcodeDetector' in window);
  }, []);

  useEffect(() => {
    if (!cameraStarted || !videoRef.current) return;
    let stream: MediaStream | null = null;
    let raf: number;
    let stopped = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // @ts-expect-error — BarcodeDetector todavía no está en el lib.dom.ts estándar de TS
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });

        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const url = codes[0]?.rawValue;
            if (url && typeof url === 'string') {
              stopped = true;
              try {
                const parsed = new URL(url);
                router.push(parsed.pathname); // navegación interna — nunca window.location a una URL externa cruda
              } catch {
                setError('El código no es un Collector Pass válido de LAMK.');
              }
              return;
            }
          } catch {
            // frame sin código detectable — normal, se sigue intentando
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setError('No se pudo acceder a la cámara. Revisa los permisos de tu navegador.');
        setCameraStarted(false);
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraStarted, router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = handleInput.trim().replace(/^@/, '');
    if (clean) router.push(`/vault/${encodeURIComponent(clean)}`);
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12 gap-6">
      <div className="text-center space-y-1">
        <span className="text-xs font-mono text-[#FF1E42] uppercase tracking-widest">// CLUB LAMK</span>
        <h1 className="font-display text-2xl font-black uppercase tracking-tight">Escanear Pass</h1>
      </div>

      {supported && (
        <div className="w-full max-w-sm space-y-3">
          {!cameraStarted ? (
            <div className="border border-border rounded-xl p-5 space-y-3 text-center bg-card">
              <p className="text-xs text-muted-foreground">
                Usamos tu cámara solo para leer el QR del Collector Pass que tienes enfrente — no se graba ni se guarda nada.
              </p>
              <button
                onClick={() => setCameraStarted(true)}
                className="w-full py-3 bg-[#FF1E42] hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition"
              >
                Activar cámara
              </button>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden border border-border aspect-square bg-black">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
              <div className="absolute inset-8 border-2 border-[#C5A059] rounded-lg pointer-events-none" />
            </div>
          )}
          {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        </div>
      )}

      {/* Alternativa siempre visible — brief C.4: "no todos van a querer dar acceso a la cámara" */}
      <div className="w-full max-w-sm border-t border-border pt-5">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2 text-center">
          {supported ? 'o busca por usuario' : 'tu navegador no soporta lectura de QR — busca por usuario'}
        </p>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 flex items-center gap-1 px-3 bg-muted border border-border rounded-lg focus-within:border-[#FF1E42]">
            <span className="text-muted-foreground font-mono text-sm">@</span>
            <input
              value={handleInput}
              onChange={(e) => setHandleInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="usuario"
              className="flex-1 py-2.5 bg-transparent text-sm text-foreground outline-none font-mono"
            />
          </div>
          <button type="submit" className="px-4 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase rounded-lg transition">
            Ver
          </button>
        </form>
      </div>
    </div>
  );
}
