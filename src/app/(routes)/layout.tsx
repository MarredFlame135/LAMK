// src/app/layout.tsx (o src/app/(routes)/layout.tsx)

import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import '../../styles/globals.css';
import { ThemeProvider } from 'next-themes';
import { SpecialCartDrawer } from '@/components/cart/SpecialCartDrawer';
import { SAAS_CONFIG } from '@/lib/saas-config';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import { ThemeVariantProvider } from '@/components/themes/ThemeVariantContext';
import { PwaRegister } from '@/components/ui/PwaRegister';
import { Navbar } from '@/components/ui/Navbar';
import { PrivacyConsentBanner } from '@/components/ui/PrivacyConsentBanner';
import { AnalyticsGate } from '@/components/analytics/AnalyticsGate';
import { CartTrigger } from '@/components/ui/CartTrigger';
import { MobileMenu } from '@/components/ui/MobileMenu';
import { getSiteUrl } from '@/lib/site-url';

export const viewport: Viewport = {
  themeColor: '#050507',
};

const SITE_URL = getSiteUrl();
const SITE_DESCRIPTION = 'Sneakers y streetwear exclusivo en México. Drops limitados, Hype Meter en vivo y entregas express.';

// Fix (hallazgo #5 de la auditoría de Fase 4): sin `metadataBase`, Next no
// puede resolver URLs relativas de `openGraph.images`/canónicas a
// absolutas. Sin `openGraph`, compartir un link de LAMK en WhatsApp o
// Instagram —el canal real de adquisición del negocio, según CLAUDE.md— no
// mostraba ninguna tarjeta de preview. De paso, el título pasa a español
// ("Exclusive Streetwear & Sneakers" no encajaba con `lang="es-MX"` ni con
// la audiencia real del sitio).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${SAAS_CONFIG.brandName} | Sneakers y Streetwear Exclusivo`,
  description: SITE_DESCRIPTION,
  manifest: '/manifest/manifest.json',
  icons: {
    icon: '/icons/icon-192.svg',
    apple: '/icons/icon-192.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    siteName: SAAS_CONFIG.brandName,
    title: `${SAAS_CONFIG.brandName} | Sneakers y Streetwear Exclusivo`,
    description: SITE_DESCRIPTION,
  },
};

// Fix (hallazgo #6 de la auditoría de Fase 4): sin esto no había ningún
// JSON-LD de marca en todo el sitio (solo el de producto, ver
// product/[handle]/page.tsx) — Organization es lo que le da a Google
// contexto de marca para el panel de conocimiento y para que Google
// Shopping asocie correctamente los productos con la tienda.
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SAAS_CONFIG.brandName,
  url: SITE_URL,
  sameAs: [SAAS_CONFIG.instagramUrl],
};

// Tipografía "Haute-Tech Luxury Vault" (editorial suiza): Inter para cuerpo/UI
// (ultra-legible, micro-tracking), Space Grotesk para headlines (mayúsculas,
// tracking apretado), JetBrains Mono para HUD/seriales/precios — se aplica
// uppercase + tracking-[0.2em] a mano donde se usa como placa técnica (ver
// ProductCard, AuthenticitySeal), no como default global del font-mono.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});
const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-MX" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable}`}>
      <body className="bg-background text-foreground antialiased min-h-screen flex flex-col font-sans selection:bg-[#FF1E42] selection:text-white">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AppProvider>
            <AuthProvider>
            <CartProvider>
            <ThemeVariantProvider>
              <PwaRegister />

              {/* Header Navbar Principal */}
              <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

                  {/* Logo de la Marca */}
                  <a href="/" className="flex items-center gap-2 group">
                    <span className="h-3 w-3 rounded-full bg-[#FF1E42] group-hover:scale-125 transition-transform" />
                    <span className="font-display font-black text-lg tracking-tight uppercase">
                      {SAAS_CONFIG.brandName}
                    </span>
                  </a>

                  {/* Navegación — Navbar es desktop-only (md:flex), MobileMenu
                      es su equivalente para <768px. CartTrigger vive en
                      ambos: antes el carrito solo se abría solo al agregar
                      un producto, no había forma de reabrirlo manualmente. */}
                  <div className="flex items-center gap-1">
                    <Navbar />
                    <CartTrigger />
                    <MobileMenu />
                  </div>

                </div>
              </header>

              {/* Contenido Dinámico */}
              <main className="flex-1">
                {children}
              </main>

              {/* Carrito Especial Flotante Global */}
              <SpecialCartDrawer />

              {/* Aviso de privacidad (LFPDPPP) — una vez por navegador */}
              <PrivacyConsentBanner />
              <AnalyticsGate />

              {/* Footer — misma textura "Obsidian Quarry" (Higgsfield) que el Hero,
                  aquí casi imperceptible, solo para que la sección oscura no
                  se sienta plana frente al resto del sitio con fotografía real.
                  Se quitó el AuthenticitySeal compact (pedido del cliente,
                  2026-08-27) — sigue disponible en la ficha de producto. */}
              <footer className="relative overflow-hidden border-t border-border bg-background py-8 text-zinc-400 text-xs text-center space-y-4">
                <div
                  className="absolute inset-0 opacity-[0.06] dark:opacity-[0.1] mix-blend-overlay pointer-events-none"
                  style={{ backgroundImage: "url('/assets/hero/obsidian-texture.webp')", backgroundSize: 'cover', backgroundPosition: 'center' }}
                  aria-hidden
                />
                <p className="relative">
                  © {new Date().getFullYear()} {SAAS_CONFIG.brandName}. Diseñado por BDM Soluciones Digitales.
                  {' · '}
                  <a href="/aviso-de-privacidad" className="hover:text-white transition">Aviso de Privacidad</a>
                </p>
              </footer>
            </ThemeVariantProvider>
            </CartProvider>
            </AuthProvider>
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}