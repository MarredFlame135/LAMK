// src/components/vault/VaultSettingsForm.tsx
//
// /vault/settings (brief B.4): Identidad, Privacidad, Notificaciones,
// Datos y seguridad. Identidad+Privacidad reusan api/social/profile (ya
// existía, con protección anti mass-assignment para menores — no se
// reinventó nada ahí). Ciudad/ubicación se dejó FUERA a propósito: el
// brief B.4 la menciona como campo opcional, pero
// docs/audit/FASE-2-PRIVACIDAD.md ya había decidido, con razón de
// seguridad física real (riesgo de deducir dónde vive alguien a partir de
// un QR escaneado en persona), que la ubicación nunca es un campo visible
// en ningún perfil — se respeta esa decisión anterior sobre la más nueva.

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { fadeUp, staggerContainer } from '@/lib/motion';

const GOLD = '#C5A059';
const CRIMSON = '#FF1E42';

type Visibility = 'public' | 'followers' | 'private';

interface ProfileData {
  username: string | null;
  bio: string | null;
  profileVisibility: Visibility;
  vaultVisibility: Visibility;
  dateOfBirth: string | null;
}

interface VaultSettingsFormProps {
  email: string;
  profile: ProfileData | null;
  linkedProviders: string[];
  pendingDeletion: string | null;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div variants={fadeUp} className="bg-card border border-border rounded-xl p-6 space-y-4">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400">// {title}</h2>
      {children}
    </motion.div>
  );
}

const VISIBILITY_OPTIONS: { value: Visibility; label: string; hint: string }[] = [
  { value: 'private', label: 'Privado', hint: 'Solo tú — no aparece en búsqueda ni es alcanzable por link.' },
  { value: 'followers', label: 'Solo seguidores', hint: 'Aparece en búsqueda; el contenido requiere que apruebes a quien te sigue.' },
  { value: 'public', label: 'Público', hint: 'Cualquiera puede verlo.' },
];

export function VaultSettingsForm({ email, profile, linkedProviders, pendingDeletion }: VaultSettingsFormProps) {
  const [username, setUsername] = useState(profile?.username ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(profile?.dateOfBirth ?? '');
  const [profileVisibility, setProfileVisibility] = useState<Visibility>(profile?.profileVisibility ?? 'private');
  const [vaultVisibility, setVaultVisibility] = useState<Visibility>(profile?.vaultVisibility ?? 'private');
  const [identityStatus, setIdentityStatus] = useState<string | null>(null);
  const [identitySaving, setIdentitySaving] = useState(false);

  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [notifStatus, setNotifStatus] = useState<string | null>(null);

  const [deletion, setDeletion] = useState(pendingDeletion);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const saveIdentityAndPrivacy = async () => {
    setIdentitySaving(true);
    setIdentityStatus(null);
    try {
      const res = await fetch('/api/social/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username || undefined, bio, dateOfBirth: dateOfBirth || undefined, profileVisibility, vaultVisibility }),
      });
      const data = await res.json();
      setIdentityStatus(res.ok ? 'Guardado.' : data.error || 'No se pudo guardar.');
    } catch {
      setIdentityStatus('Error de red.');
    } finally {
      setIdentitySaving(false);
    }
  };

  const saveNotifications = async (next: boolean) => {
    setMarketingOptIn(next);
    setNotifStatus(null);
    try {
      const res = await fetch('/api/vault/settings/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketingOptIn: next }),
      });
      setNotifStatus(res.ok ? 'Guardado.' : 'No se pudo guardar.');
    } catch {
      setNotifStatus('Error de red.');
    }
  };

  const requestDeletion = async () => {
    setDeleteError(null);
    setDeleteBusy(true);
    try {
      const res = await fetch('/api/vault/settings/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || 'No se pudo procesar la solicitud.');
        return;
      }
      setDeletion(data.scheduledFor);
    } finally {
      setDeleteBusy(false);
    }
  };

  const cancelDeletion = async () => {
    setDeleteBusy(true);
    try {
      await fetch('/api/vault/settings/delete-account', { method: 'DELETE' });
      setDeletion(null);
      setConfirmEmail('');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <motion.div
      variants={staggerContainer(0.08)}
      initial="hidden"
      animate="show"
      className="max-w-2xl mx-auto p-6 bg-background text-foreground space-y-6"
    >
      <motion.div variants={fadeUp} className="border-b border-border pb-4">
        <span className="text-xs font-mono text-[#FF1E42] uppercase tracking-widest">// CONFIGURACIÓN</span>
        <h1 className="font-display text-3xl font-black uppercase tracking-tight mt-1">Tu Cuenta</h1>
      </motion.div>

      {/* Identidad */}
      <SectionCard title="Identidad">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Usuario (handle público)</label>
          <div className="flex items-center gap-1">
            <span className="text-zinc-500 font-mono text-sm">@</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="tu_usuario"
              maxLength={24}
              className="flex-1 p-2.5 bg-black border border-border rounded-lg text-sm text-white outline-none focus:border-[#FF1E42] font-mono"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Bio ({bio.length}/280)</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 280))}
            rows={2}
            className="w-full p-2.5 bg-black border border-border rounded-lg text-sm text-white outline-none focus:border-[#FF1E42] resize-none"
          />
        </div>
        {!profile?.dateOfBirth && (
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Fecha de nacimiento</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="p-2.5 bg-black border border-border rounded-lg text-sm text-white outline-none focus:border-[#FF1E42]"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              Necesaria para activar funciones sociales (QR, seguir, bóveda pública) — protege tu cuenta si eres menor de edad. No se puede cambiar después desde aquí.
            </p>
          </div>
        )}

        <div className="pt-2 space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Visibilidad</p>
          {([
            { key: 'profileVisibility' as const, label: 'Perfil', value: profileVisibility, set: setProfileVisibility },
            { key: 'vaultVisibility' as const, label: 'Bóveda pública', value: vaultVisibility, set: setVaultVisibility },
          ]).map((row) => (
            <div key={row.key}>
              <p className="text-xs text-zinc-300 mb-1">{row.label}</p>
              <div className="grid grid-cols-3 gap-1.5">
                {VISIBILITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => row.set(opt.value)}
                    title={opt.hint}
                    className="py-2 rounded-lg border text-[10px] font-mono uppercase tracking-wide transition"
                    style={
                      row.value === opt.value
                        ? { borderColor: GOLD, color: GOLD, background: 'rgba(197,160,89,0.08)' }
                        : { borderColor: 'var(--border)', color: '#a1a1aa' }
                    }
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={saveIdentityAndPrivacy}
            disabled={identitySaving}
            className="px-5 py-2 bg-[#FF1E42] hover:bg-red-700 disabled:opacity-60 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition"
          >
            {identitySaving ? 'Guardando...' : 'Guardar'}
          </button>
          {identityStatus && <span className="text-xs text-zinc-400">{identityStatus}</span>}
        </div>
      </SectionCard>

      {/* Notificaciones */}
      <SectionCard title="Notificaciones">
        <label className="flex items-start gap-2.5 text-xs text-zinc-300 cursor-pointer">
          <input
            type="checkbox"
            checked={marketingOptIn}
            onChange={(e) => saveNotifications(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
            style={{ accentColor: CRIMSON }}
          />
          <span>Quiero recibir avisos de drops y restocks por WhatsApp.</span>
        </label>
        {notifStatus && <span className="text-xs text-zinc-500">{notifStatus}</span>}
      </SectionCard>

      {/* Datos y seguridad */}
      <SectionCard title="Datos y Seguridad">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-300">Contraseña</span>
          <a href="/auth/reset-password" className="text-xs text-[#FF1E42] font-bold hover:underline">Cambiar →</a>
        </div>

        <div>
          <p className="text-xs text-zinc-300 mb-1">Cuentas vinculadas</p>
          {linkedProviders.length === 0 ? (
            <p className="text-[11px] text-zinc-500">Ninguna todavía.</p>
          ) : (
            <p className="text-[11px] text-zinc-400 font-mono uppercase">{linkedProviders.join(', ')}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-300">Exportar mis datos</span>
          <a href="/api/vault/settings/export" className="text-xs text-[#FF1E42] font-bold hover:underline">Descargar JSON →</a>
        </div>

        {/* Zona de riesgo */}
        <div className="pt-3 mt-3 border-t border-red-900/30 space-y-3">
          <p className="text-[10px] font-mono uppercase tracking-widest" style={{ color: CRIMSON }}>Eliminar cuenta</p>

          {deletion ? (
            <div className="p-3 rounded-lg border border-red-900/50 bg-red-950/20 space-y-2">
              <p className="text-xs text-zinc-300">
                Tu cuenta se eliminará el{' '}
                <strong className="text-white">{new Date(deletion).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>.
                Puedes cancelar en cualquier momento antes de esa fecha.
              </p>
              <button
                onClick={cancelDeletion}
                disabled={deleteBusy}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition"
              >
                Cancelar eliminación
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-zinc-500">
                Se borra tu perfil social, bóveda pública, Most Wanted y cuentas vinculadas, 14 días después de confirmar (puedes cancelar antes). Si ya tienes pedidos, Shopify no permite borrar ese historial — se conserva por obligación fiscal, nunca se vuelve a usar para nada más.
              </p>
              <input
                type="email"
                placeholder={`Escribe "${email}" para confirmar`}
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="w-full p-2.5 bg-black border border-red-900/50 rounded-lg text-sm text-white outline-none focus:border-[#FF1E42]"
              />
              {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
              <button
                onClick={requestDeletion}
                disabled={deleteBusy || confirmEmail.toLowerCase() !== email.toLowerCase()}
                className="px-4 py-2 bg-red-950 hover:bg-red-900 disabled:opacity-40 disabled:cursor-not-allowed text-red-300 text-xs font-bold uppercase tracking-widest rounded-lg border border-red-900 transition"
              >
                Solicitar eliminación
              </button>
            </div>
          )}
        </div>
      </SectionCard>
    </motion.div>
  );
}
