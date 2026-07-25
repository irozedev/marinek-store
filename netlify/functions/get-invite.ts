import type { Config } from '@netlify/functions';
import { db, type Order } from '../lib/db';
import { inviteHash } from '../lib/telegram';

/**
 * Те, що читає /thank-you. Доступ дає access_token — 24 випадкові байти
 * (192 біти), тож перебирати його безглуздо; спеціального rate limit тут
 * немає свідомо, бо в serverless лічильник у пам'яті не переживає холодний
 * старт і давав би лише видимість захисту.
 *
 * Віддаємо мінімум: статус, посилання і план. Ні сум, ні пошти, ні
 * order_reference — сторінці вони не потрібні.
 */

export default async (req: Request): Promise<Response> => {
  const token = new URL(req.url).searchParams.get('t');

  // Токен фіксованої довжини — усе інше відсікаємо, не ходячи в базу.
  if (!token || !/^[a-f0-9]{48}$/.test(token)) {
    return json({ error: 'not_found' }, 404);
  }

  const { data: order } = await db()
    .from('orders')
    .select('plan, status, invite_link, invite_expires_at')
    .eq('access_token', token)
    .single<Pick<Order, 'plan' | 'status' | 'invite_link' | 'invite_expires_at'>>();

  if (!order) return json({ error: 'not_found' }, 404);

  const hash = order.invite_link ? inviteHash(order.invite_link) : null;

  return json({
    status: order.status,
    plan: order.plan,
    inviteLink: order.invite_link,
    // tg:// відкриває застосунок навіть коли домен t.me недоступний.
    inviteAppLink: hash ? `tg://join?invite=${hash}` : null,
    expiresAt: order.invite_expires_at,
  });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export const config: Config = { path: '/api/get-invite' };
