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
import { AuthenticitySeal } from '@/components/ui/AuthenticitySeal';
import { CustomCursor } from '@/components/ui/CustomCursor';

export const viewport: Viewport = {
  themeColor: '#050507',
};

export const metadata: Metadata = {
  title: `${SAAS_CONFIG.brandName} | Exclusive Streetwear & Sneakers`,
  description: 'Plataforma e-commerce PWA de calzado y ropa streetwear premium en México. Drops exclusivos, Hype Meter y entregas express.',
  manifest: '/manifest/manifest.json',
  icons: {
    icon: '/icons/icon-192.svg',
    apple: '/icons/icon-192.svg',
  },
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
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AppProvider>
            <AuthProvider>
            <CartProvider>
            <ThemeVariantProvider>
              <PwaRegister />
              <CustomCursor />

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

                  {/* Navegación */}
                  <Navbar />

                </div>
              </header>

              {/* Contenido Dinámico */}
              <main className="flex-1">
                {children}
              </main>

              {/* Carrito Especial Flotante Global */}
              <SpecialCartDrawer />

              {/* Footer — misma textura "Obsidian Quarry" (Higgsfield) que el Hero,
                  aquí casi imperceptible, solo para que la sección oscura no
                  se sienta plana frente al resto del sitio con fotografía real. */}
              <footer className="relative overflow-hidden border-t border-border bg-background py-8 text-zinc-500 text-xs text-center space-y-4">
                <div
                  className="absolute inset-0 opacity-[0.06] dark:opacity-[0.1] mix-blend-overlay pointer-events-none"
                  style={{ backgroundImage: "url('/assets/hero/obsidian-texture.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
                  aria-hidden
                />
                <div className="relative flex justify-center">
                  <AuthenticitySeal compact />
                </div>
                <p className="relative">© {new Date().getFullYear()} {SAAS_CONFIG.brandName}. PWA POWERED BY HYDROGEN & NEXT.JS.</p>
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