// src/app/api/auth/[...nextauth]/route.ts
//
// La config real vive en src/lib/social-auth/auth-options.ts — un route.ts
// de App Router solo puede exportar métodos HTTP (GET/POST/...) y un
// puñado de configs reservadas; exportar `authOptions` desde aquí también
// rompe la validación de tipos de `next build`.

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/social-auth/auth-options';

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
