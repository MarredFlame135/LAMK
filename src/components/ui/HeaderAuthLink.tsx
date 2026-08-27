// src/components/ui/HeaderAuthLink.tsx
//
// Estado de sesión real en el header: "Iniciar sesión" si no hay cliente
// logueado, o su nombre + logout si sí lo hay.

'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/context/AppContext';

export function HeaderAuthLink() {
  const { user, isLoading, logout } = useAuth();
  const { t } = useApp();

  if (isLoading) return <span className="text-zinc-600">···</span>;

  if (!user) {
    return (
      <a href="/auth/login" className="text-zinc-400 hover:text-white transition">
        {t.nav.login}
      </a>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <a href="/vault" className="text-amber-400 hover:text-amber-300 transition">
        {t.nav.hello} {user.firstName.toUpperCase()}
      </a>
      <button onClick={logout} className="text-zinc-500 hover:text-red-400 transition normal-case font-normal">
        {t.nav.logout}
      </button>
    </div>
  );
}
