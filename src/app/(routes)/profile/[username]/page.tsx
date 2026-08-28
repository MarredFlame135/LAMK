// src/app/(routes)/profile/[username]/page.tsx

import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CollectorVault } from '@/components/vault/CollectorVault';
import { getUserByUsername } from '@/lib/mock-users';

interface ProfilePageProps {
  params: { username: string };
}

// Fix (hallazgo #2 de la auditoría de Fase 4): sin esto, cualquier perfil
// de coleccionista era indexable por Google por defecto — el mismo riesgo
// que motivó el modelo de privacidad de la Fase 2 (perfiles deben nacer
// privados), solo que vía buscador en vez de un QR físico. `noindex` va
// aquí como meta tag (saca/evita que la URL entre al índice de verdad); el
// `disallow` en robots.ts es un refuerzo, no un sustituto — un disallow
// por sí solo no saca del índice una URL que Google ya haya indexado antes.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ProfilePage({ params }: ProfilePageProps) {
  const user = getUserByUsername(params.username);

  if (!user) {
    notFound();
  }

  return <CollectorVault user={user} username={params.username.replace(/^@/, '').toLowerCase()} isOwnProfile={false} />;
}
