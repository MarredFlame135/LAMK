// src/app/layout.tsx (o src/app/(routes)/layout.tsx)

import type { Metadata, Viewport } from 'next';
import '../../styles/globals.css';
import { ThemeProvider } from 'next-themes';
import { SpecialCartDrawer } from '@/components/cart/SpecialCartDrawer';
import { SAAS_CONFIG } from '@/lib/saas-config';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider } from '@/context/AuthContext';
import { PwaRegister } from '@/components/ui/PwaRegister';
import { HeaderAuthLink } from '@/components/ui/HeaderAuthLink';

export const viewport: Viewport = {
  themeColor: '#0A0A0C',
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-MX" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased min-h-screen flex flex-col font-sans selection:bg-[#E60026] selection:text-white">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AppProvider>
            <AuthProvider>
              <PwaRegister />

              {/* Header Navbar Principal */}
              <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

                  {/* Logo de la Marca */}
                  <a href="/" className="flex items-center gap-2 group">
                    <span className="h-3 w-3 rounded-full bg-[#E60026] group-hover:scale-125 transition-transform" />
                    <span className="font-black text-lg tracking-tight uppercase">
                      {SAAS_CONFIG.brandName}
                    </span>
                  </a>

                  {/* Navegación */}
                  <nav className="hidden md:flex items-center gap-6 text-xs font-bold tracking-widest uppercase text-zinc-400">
                    <a href="/" className="hover:text-[#E60026] transition">INICIO</a>
                    <a href="/catalog" className="hover:text-foreground transition">CATÁLOGO</a>
                    <a href="/vault" className="hover:text-foreground transition">BÓVEDA</a>
                    <a href="/admin/offline-sales" className="hover:text-foreground transition">ADMIN</a>
                    <HeaderAuthLink />
                  </nav>

                </div>
              </header>

              {/* Contenido Dinámico */}
              <main className="flex-1">
                {children}
              </main>

              {/* Carrito Especial Flotante Global */}
              <SpecialCartDrawer />

              {/* Footer */}
              <footer className="border-t border-border bg-background py-8 text-zinc-500 text-xs text-center">
                <p>© {new Date().getFullYear()} {SAAS_CONFIG.brandName}. PWA POWERED BY HYDROGEN & NEXT.JS.</p>
              </footer>
            </AuthProvider>
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}