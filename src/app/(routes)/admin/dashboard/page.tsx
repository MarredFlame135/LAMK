// src/app/(routes)/admin/dashboard/page.tsx
//
// Esta ruta existía como carpeta vacía (sin page.tsx) — un 404 silencioso.
// El panel de administración real es uno solo, con todos los módulos
// apilados (ver AdminDashboard.tsx), montado hoy en /admin/offline-sales.
// Redirige aquí en vez de dejar la URL rota.

import { redirect } from 'next/navigation';

export default function AdminDashboardRedirect() {
  redirect('/admin/offline-sales');
}
