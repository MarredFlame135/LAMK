// src/hooks/useClients.ts
//
// Cliente delgado sobre /api/admin/customers — mismo patrón que useLayaway.ts.

'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminCustomerDetail } from '@/types/admin';

export function useClients() {
  const [customers, setCustomers] = useState<AdminCustomerDetail[]>([]);
  const [adminApiConfigured, setAdminApiConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    setIsLoading(true);
    fetch('/api/admin/customers')
      .then((res) => res.json())
      .then((data) => {
        setCustomers(data.customers || []);
        setAdminApiConfigured(Boolean(data.adminApiConfigured));
      })
      .catch((err) => console.error('Error al cargar clientes:', err))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);

  const addPaymentNote = async (layawayId: string, amount: number, note: string) => {
    await fetch('/api/admin/layaway', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: layawayId, addPaymentNote: { amount, note } }),
    });
    refresh();
  };

  return { customers, adminApiConfigured, isLoading, refresh, addPaymentNote };
}
