// src/app/(routes)/admin/inventory/page.tsx
//
// Misma situación que /admin/dashboard: carpeta vacía sin page.tsx. El
// módulo de inventario (InventoryManager) vive dentro del panel único en
// /admin/offline-sales, no en su propia ruta — redirige en vez de 404.

import { redirect } from 'next/navigation';

export default function AdminInventoryRedirect() {
  redirect('/admin/offline-sales');
}
