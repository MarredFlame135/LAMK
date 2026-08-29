// src/lib/social/auth.ts
//
// Mismo patrón que ya usa api/reviews/route.ts: la cookie httpOnly del
// cliente (`lamk_customer_token`) es la única fuente de identidad — nunca
// se confía en un customerId que venga en el body de la request.

import { NextRequest } from 'next/server';
import { getCustomerProfile } from '@/lib/shopify/customer';
import { UserProfile } from '@/types/user';

export async function requireCustomer(request: NextRequest): Promise<UserProfile | null> {
  const token = request.cookies.get('lamk_customer_token')?.value;
  if (!token) return null;
  return getCustomerProfile(token);
}
