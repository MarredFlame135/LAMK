// src/app/(routes)/vault/pass/page.tsx

import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { socialProfiles } from '@/db/schema';
import { getCustomerProfile } from '@/lib/shopify/customer';
import { deriveCollectorSerial } from '@/lib/utils';
import { getSiteUrl } from '@/lib/site-url';
import { PassManager } from '@/components/vault/PassManager';

export const dynamic = 'force-dynamic';

export default async function VaultPassPage() {
  const token = cookies().get('lamk_customer_token')?.value;
  if (!token) redirect('/auth/login');

  const user = await getCustomerProfile(token);
  if (!user) redirect('/auth/login');

  const db = getDb();
  const [profile] = await db.select().from(socialProfiles).where(eq(socialProfiles.customerId, user.id)).limit(1);

  // Sin username público, no hay nada que compartir por QR — se manda a
  // configurarlo primero en vez de dejar que el botón "generar" falle con
  // un error de API que no explica por qué (ver api/social/qr/route.ts).
  if (!profile?.username || profile.profileVisibility === 'private') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 text-center">
        <div className="max-w-sm space-y-4">
          <p className="text-sm text-zinc-400">
            Necesitas un usuario público y visibilidad distinta a "Privado" antes de generar tu Collector Pass.
          </p>
          <a href="/vault/settings" className="inline-block px-5 py-2.5 bg-[#FF1E42] hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition">
            Configurar mi perfil →
          </a>
        </div>
      </div>
    );
  }

  const serial = deriveCollectorSerial(user.id).replace('LK-C-', '');

  return (
    <div className="min-h-[80vh] py-12 px-4">
      <PassManager
        handle={profile.username}
        serial={serial}
        tier={user.tier}
        xp={user.xp}
        pieces={user.collection.length}
        siteUrl={getSiteUrl()}
        featuredImageUrl={user.collection[0]?.imageUrl ?? null}
      />
    </div>
  );
}
