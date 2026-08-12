import type { Config } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { db, type Order } from '../lib/db';

/**
 * Останні замовлення для кабінету.
 *
 * ЧОМУ ФУНКЦІЯ, А НЕ ПОЛІТИКА RLS НА `orders`. У цій таблиці лежать
 * `invite_link` і `access_token` — це не «дані про замовлення», це живі
 * ключі від платного каналу. Політика `select` відкрила б браузеру
 * ВЕСЬ рядок: RLS фільтрує рядки, а не колонки. Тобто посилання на
 * канал знову читалося б із devtools — рівно та витік, заради усунення
 * якого 25.07 переробляли всю видачу доступу.
 *
 * Тут же ми самі вирішуємо, що віддати. Пошта лишається повністю: без
 * неї список марний, бо єдиний сценарій, де він потрібен, — «жінка
 * каже, що не отримала доступ, треба знайти її замовлення». Посилання,
 * токен і сире тіло вебхука не віддаються ніколи.
 *
 * Сума й статус беруться з бази, а вона наповнюється лише підписаним
 * вебхуком WayForPay. Тобто це не «наша версія подій», а те саме, що
 * Марина бачить у кабінеті еквайра.
 */

const LIMIT = 30;

type Row = Pick<
  Order,
  'order_reference' | 'plan' | 'amount' | 'currency' | 'status' | 'email' | 'created_at' | 'paid_at'
> & { invite_issued_at: string | null; email_sent_at: string | null };

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'GET') return json({ message: 'method_not_allowed' }, 405);

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token || !(await isAdmin(token))) {
    return json({ message: 'Схоже, ви вийшли з кабінету. Увійдіть ще раз.' }, 401);
  }

  const { data, error } = await db()
    .from('orders')
    .select(
      'order_reference, plan, amount, currency, status, email, created_at, paid_at, invite_issued_at, email_sent_at',
    )
    // Викидаємо покинуті спроби: людина відкрила сторінку оплати й пішла,
    // не ввівши навіть пошту. WayForPay пише їх як «Відхилено» з кодом
    // 1124 (сесія власника картки завершилась), і таких у нас більшість —
    // на серпень 55 із 60. Показувати їх Марині шкідливо: два десятки
    // червоних рядків читаються як «сайт зламався», хоча не сталося
    // нічого. Лишаємо оплачені завжди, а невдалі — лише коли відомо,
    // хто це, бо тільки тоді з ними можна щось зробити.
    .or('status.eq.paid,email.not.is.null')
    .order('created_at', { ascending: false })
    .limit(LIMIT);

  if (error) {
    console.error('list-orders:', error);
    return json({ message: 'Не вдалося прочитати замовлення.' }, 500);
  }

  const rows = (data ?? []) as Row[];

  return json({
    orders: rows.map((o) => ({
      ref: o.order_reference,
      plan: o.plan,
      amount: o.amount,
      currency: o.currency,
      status: o.status,
      email: o.email,
      date: o.paid_at ?? o.created_at,
      // Прапорці, а не дати: у списку важливе лише «дійшло / не дійшло».
      inviteIssued: Boolean(o.invite_issued_at),
      emailSent: Boolean(o.email_sent_at),
    })),
  });
};

/**
 * Мало перевірити, що токен валідний: зареєструватись у проєкті може
 * будь-хто (реєстрація в Supabase відкрита). Право дає рядок у `admins`,
 * як і скрізь у кабінеті. Питаємо базу під service_role, бо сама
 * `admins` закрита політиками наглухо.
 */
async function isAdmin(token: string): Promise<boolean> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY не задані');

  const { data, error } = await createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).auth.getUser(token);

  if (error || !data?.user) return false;

  const { data: row } = await db()
    .from('admins')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle();

  return Boolean(row);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export const config: Config = { path: '/api/list-orders' };
