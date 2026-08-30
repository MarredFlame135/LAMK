// src/app/(routes)/admin/dashboard/page.tsx
//
// Fix (Fase D): /admin ya es el Panel de Mando real desde esta fase (ver
// admin/page.tsx) — antes redirigía a /admin/offline-sales porque /admin
// no tenía page.tsx propio. El panel operativo (ventas offline, clientes,
// inventario, apartados) sigue en /admin/offline-sales, enlazado desde
// el nuevo Panel de Mando.

import { redirect } from 'next/navigation';

export default function AdminDashboardRedirect() {
  redirect('/admin');
}
