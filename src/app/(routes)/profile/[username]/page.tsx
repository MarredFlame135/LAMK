// src/app/(routes)/profile/[username]/page.tsx
//
// Esta ruta ya NO tiene implementación propia: redirige permanentemente a
// /vault/@usuario.
//
// Por qué, y no "conectarla a Postgres" como una segunda vista: el perfil
// público real ya existe en /vault/[handle], y ahí no solo se leen datos —
// se aplica el modelo de privacidad completo de la Fase 2 (visibilidad
// público/seguidores/privado según la relación real con quien visita,
// bloqueos en ambos sentidos, reglas para cuentas de menores, y la vista
// forzadamente conservadora cuando la visita viene de un QR escaneado).
//
// Reimplementar todo eso aquí para que /profile/x se viera "igual pero con
// datos reales" significaría dos superficies distintas obligadas a aplicar
// las mismas reglas de privacidad — y el día que una cambie y la otra no, la
// que se quede atrás filtra la bóveda de alguien. Una sola implementación es
// la única forma de que eso no pueda pasar.
//
// Con esto muere también src/lib/mock-users.ts (deuda técnica #2 de
// CLAUDE.md): era el último archivo del proyecto que servía datos
// inventados a una pantalla real.

import { permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';

interface ProfilePageProps {
  params: { username: string };
}

// Se conserva el noindex (hallazgo #2 de la Fase 4): aunque ahora sea una
// redirección, la URL vieja pudo haber quedado en el índice de algún
// buscador y no debe volver a entrar.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ProfilePage({ params }: ProfilePageProps) {
  const handle = params.username.replace(/^@/, '').toLowerCase();
  // 308 y no 307: la mudanza es definitiva, y así cualquier enlace viejo
  // compartido por WhatsApp o impreso en un QR anterior sigue llegando.
  permanentRedirect(`/vault/@${encodeURIComponent(handle)}`);
}
