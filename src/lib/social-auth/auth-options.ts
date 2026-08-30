// src/lib/social-auth/auth-options.ts
//
// Separado de app/api/auth/[...nextauth]/route.ts a propósito: Next.js
// App Router valida en tiempo de tipos que un archivo route.ts SOLO
// exporte los métodos HTTP y un puñado de configs reservadas (dynamic,
// revalidate, etc.) — exportar `authOptions` desde ahí rompe `next build`
// ("Property 'authOptions' is incompatible with index signature").
//
// NextAuth SOLO maneja el baile de OAuth con Google/Apple — nunca se
// convierte en el sistema de sesión real del sitio. Al terminar, el
// callback `signIn` de abajo llama al puente (lib/social-auth/bridge.ts),
// que devuelve un token real de Shopify Customer, y ESE es el que se
// guarda en `lamk_customer_token` (la misma cookie que ya usa todo el
// resto del sitio — login con contraseña, middleware, AuthContext). La
// sesión propia de NextAuth queda como subproducto sin usar; no vale la
// pena pelear con la librería para desactivarla del todo.
//
// Providers configurados condicionalmente: si no hay credenciales en
// .env.local, ese proveedor simplemente no aparece en la lista — el sitio
// no se rompe por no tener Google/Apple configurados todavía (mismo
// principio que hasShopifyCredentials en catalog-source.ts).

import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AppleProvider from 'next-auth/providers/apple';
import { cookies } from 'next/headers';
import { handleOAuthSignIn } from './bridge';
import { isAppleConfigured, generateAppleClientSecret } from './apple-client-secret';

const providers: NextAuthOptions['providers'] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (isAppleConfigured()) {
  providers.push(
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID!,
      // Se regenera en cada arranque (ver apple-client-secret.ts) — nunca
      // un valor pegado a mano en .env que expiraría en silencio.
      clientSecret: generateAppleClientSecret(),
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: 'jwt' },
  pages: { signIn: '/auth/login' },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || (account.provider !== 'google' && account.provider !== 'apple')) return false;
      const email = user.email;
      if (!email) return '/auth/login?socialError=sin_correo';

      // Google confirma verificación en el propio profile (email_verified).
      // Apple, por diseño de su plataforma, solo entrega un correo cuando
      // ya está verificado — no manda ese campo, así que se trata como
      // verificado siempre que Apple lo devuelva.
      const emailVerified = account.provider === 'google' ? (profile as any)?.email_verified === true : true;

      const result = await handleOAuthSignIn({
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        email,
        emailVerified,
        firstName: (profile as any)?.given_name || user.name?.split(' ')[0],
        lastName: (profile as any)?.family_name || user.name?.split(' ').slice(1).join(' '),
      });

      switch (result.status) {
        case 'ok':
          cookies().set('lamk_customer_token', result.token.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            expires: new Date(result.token.expiresAt),
          });
          return true;
        case 'needs_password_confirmation':
          return `/auth/link-account?email=${encodeURIComponent(result.email)}&provider=${account.provider}&providerAccountId=${encodeURIComponent(account.providerAccountId)}`;
        case 'consent_required':
          return '/auth/register?socialError=consentimiento';
        case 'email_not_verified':
          return '/auth/register?socialError=correo_no_verificado';
        default:
          return false;
      }
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return `${baseUrl}/vault`;
    },
  },
};
