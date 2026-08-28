// src/context/AuthContext.tsx
//
// Sesión real de cliente (HU-01): el token de Shopify vive en una cookie
// httpOnly (nunca en JS), este contexto solo guarda el perfil ya resuelto por
// /api/auth/me para que el resto de la app sepa si hay alguien logueado.
//
// `isAdmin` (2026-08-27): booleano calculado server-side en /api/auth/me —
// nunca la lista de correos admin, solo "sí/no" para este usuario. Permite
// que Navbar.tsx muestre un link privado al panel de admin sin exponer
// nada sensible al bundle de cliente.

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '@/types/user';

interface AuthContextType {
  user: UserProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setUser(data.user || null);
      setIsAdmin(Boolean(data.isAdmin));
    } catch (err) {
      console.error('Error al verificar sesión de cliente:', err);
      setUser(null);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setIsAdmin(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, isAdmin, isLoading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
