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
import { PassActivation } from '@/components/vault/PassActivation';

export const dynamic = 'force-dynamic';

export default async function VaultPassPage() {
  const token = cookies().get('lamk_customer_token')?.value;
  if (!token) redirect('/auth/login');

  const user = await getCustomerProfile(token);
  if (!user) redirect('/auth/login');

  const db = getDb();
  const [profile] = await db.select().from(socialProfiles).where(eq(socialProfiles.customerId, user.id)).limit(1);

  // Sin username público no hay nada que compartir por QR. Antes esto era un
  // muro que mandaba a /vault/settings —otra pantalla, seis secciones, adivina
  // cuáles tres campos importan— y encima el de allá respondía "Guardado."
  // aunque el servidor hubiera forzado 'private' por no tener fecha de
  // nacimiento declarada. Resultado: el Pass era inalcanzable en la práctica.
  // Ahora se activa aquí mismo, en un paso. Ver PassActivation.tsx.
  if (!profile?.username || profile.profileVisibility === 'private') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
        <PassActivation currentUsername={profile?.username ?? null} />
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
