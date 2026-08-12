import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Клієнт Supabase для сторінки /admin — єдине місце, де сайт ходить у базу
 * прямо з браузера.
 *
 * Ці два значення публічні НАВМИСНО: publishable-ключ сам по собі не
 * відкриває нічого. Що саме видно й що можна змінити, вирішує RLS
 * (db/002_content.sql): політики виписані тільки для ролі `authenticated`,
 * тож без входу запити повертають порожньо. Це принципово інша річ, ніж
 * service_role-ключ, який RLS обходить і живе лише у функціях.
 */

let cached: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY не задані. ' +
        'Це змінні збірки — після їх зміни потрібен ребілд.',
    );
  }

  cached = createClient(url, key);
  return cached;
}

export const RESULTS_BUCKET = 'results';
