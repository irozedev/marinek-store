import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Клієнт Supabase під service_role — обходить RLS. Використовується ТІЛЬКИ
 * у функціях на сервері. Ключ не має префікса NEXT_PUBLIC_, тож у клієнтський
 * бандл не потрапить.
 */

export type OrderStatus = 'pending' | 'paid' | 'declined' | 'refunded';

export type Order = {
  id: string;
  order_reference: string;
  access_token: string;
  plan: 'standard' | 'chat' | 'personal';
  amount: number;
  currency: string;
  status: OrderStatus;
  email: string | null;
  phone: string | null;
  client_name: string | null;
  transaction_status: string | null;
  reason_code: string | null;
  invite_link: string | null;
  invite_issued_at: string | null;
  invite_expires_at: string | null;
  email_sent_at: string | null;
  paid_at: string | null;
  created_at: string;
};

let cached: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY не задані');

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
