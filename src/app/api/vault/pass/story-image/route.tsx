// src/app/api/vault/pass/story-image/route.tsx
//
// Exportable como imagen para stories de Instagram (brief C.1) — 1080×1920,
// misma infraestructura ImageResponse que opengraph-image.tsx (Fase A).
// Público a propósito (sin requireCustomer): el token del QR ya es lo que
// protege esto — cualquiera con el token válido puede pedir esta imagen,
// igual que cualquiera puede escanear el QR físico.

import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { socialProfiles, qrTokens } from '@/db/schema';
import { getProfileView } from '@/lib/social/profile-view';
import { getStoreCustomersWithXp } from '@/lib/shopify/admin';
import { deriveCollectorSerial } from '@/lib/utils';
import { loadBrandOgFonts } from '@/lib/og-fonts';
import { SAAS_CONFIG } from '@/lib/saas-config';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const OBSIDIAN = '#050507';
  const CRIMSON = '#FF1E42';
  const GOLD = '#C5A059';
  const BONE = '#F5F3ED';
  const fonts = await loadBrandOgFonts();

  if (!token) {
    return new ImageResponse(<div style={{ display: 'flex', width: '100%', height: '100%', background: OBSIDIAN }} />, { width: 1080, height: 1920 });
  }

  const db = getDb();
  const [tokenRow] = await db.select().from(qrTokens).where(eq(qrTokens.token, token)).limit(1);
  const customerId = tokenRow && !tokenRow.revokedAt ? tokenRow.customerId : null;

  const [profile] = customerId ? await db.select().from(socialProfiles).where(eq(socialProfiles.customerId, customerId)).limit(1) : [null];
  const view = customerId ? await getProfileView(customerId, null, { isQrScan: true }) : null;

  if (!profile || !view) {
    return new ImageResponse(
      <div style={{ display: 'flex', width: '100%', height: '100%', background: OBSIDIAN, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Space Grotesk', fontSize: 48, color: BONE }}>{SAAS_CONFIG.brandName}</div>
      </div>,
      { width: 1080, height: 1920, fonts }
    );
  }

  let tier = '';
  try {
    const customers = await getStoreCustomersWithXp(500);
    tier = customers.find((c) => c.id === customerId)?.tier ?? '';
  } catch {
    // sin Admin API — se omite el tier, no rompe la imagen
  }

  const serial = deriveCollectorSerial(customerId!);
  const grail = view.vault[0];

  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: OBSIDIAN, padding: 80, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 20, height: 20, borderRadius: 10, background: CRIMSON, display: 'flex' }} />
          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 22, color: '#8E8E98', letterSpacing: 4, textTransform: 'uppercase', display: 'flex' }}>
            {SAAS_CONFIG.shortBrandName} // Collector Pass
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          {grail?.imageUrl && (
            <img src={grail.imageUrl} width={420} height={420} style={{ objectFit: 'cover', borderRadius: 24 }} />
          )}
          <div style={{ display: 'flex', fontFamily: 'Space Grotesk', fontSize: 64, fontWeight: 700, color: BONE, textTransform: 'uppercase' }}>
            @{profile.username}
          </div>
          {tier && (
            <div style={{ display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 28, fontWeight: 700, color: CRIMSON, letterSpacing: 3, textTransform: 'uppercase' }}>
              {tier}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 20, color: GOLD, letterSpacing: 2 }}>
            #{serial}
          </div>
          <div style={{ display: 'flex', fontFamily: 'JetBrains Mono', fontSize: 20, color: '#8E8E98' }}>
            {view.vault.length} piezas
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920, fonts }
  );
}
