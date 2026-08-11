import type { Config } from '@netlify/functions';
import { db, type Order } from '../lib/db';

/**
 * Те, що читає /thank-you. Доступ дає access_token — 24 випадкові байти
 * (192 біти), тож перебирати його безглуздо; спеціального rate limit тут
 * немає свідомо, бо в serverless лічильник у пам'яті не переживає холодний
 * старт і давав би лише видимість захисту.
 *
 * ПОСИЛАННЯ НА КАНАЛ ЗВІДСИ БІЛЬШЕ НЕ ВІДДАЄТЬСЯ. Єдиний канал видачі —
 * лист. Прибрати посилання лише з вёрстки було б косметикою: воно й далі
 * лежало б у відповіді API і читалося у вкладці Network.
 *
 * Що це дає: інвайт одноразовий і живе 7 днів, а адреса сторінки з токеном
 * легко переживає власника — лишилась у вкладці, в історії, на спільному
 * комп'ютері. Пошта прив'язана до людини, сторінка — ні.
 *
 * Віддаємо мінімум, потрібний для тексту на сторінці: статус, план, чи
 * видано доступ, чи пішов лист і на який ящик (замаскований — щоб було
 * видно одруківку в адресі, але не сам адрес).
 */

export default async (req: Request): Promise<Response> => {
  const token = new URL(req.url).searchParams.get('t');

  // Токен фіксованої довжини — усе інше відсікаємо, не ходячи в базу.
  if (!token || !/^[a-f0-9]{48}$/.test(token)) {
    return json({ error: 'not_found' }, 404);
  }

  const { data: order } = await db()
    .from('orders')
    .select('plan, status, email, invite_link, email_sent_at')
    .eq('access_token', token)
    .single<Pick<Order, 'plan' | 'status' | 'email' | 'invite_link' | 'email_sent_at'>>();

  if (!order) return json({ error: 'not_found' }, 404);

  return json({
    status: order.status,
    plan: order.plan,
    // Не саме посилання, а лише факт: доступ видано.
    inviteIssued: Boolean(order.invite_link),
    emailSent: Boolean(order.email_sent_at),
    email: maskEmail(order.email),
  });
};

/**
 * `marina@gmail.com` → `ma****@gmail.com`. Домен лишаємо повністю: без нього
 * людина не зрозуміє, у якій пошті шукати, а це головна причина, чому лист
 * «не прийшов».
 */
function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const at = email.lastIndexOf('@');
  if (at < 1) return null;

  const name = email.slice(0, at);
  const domain = email.slice(at);
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${'*'.repeat(Math.max(name.length - visible.length, 1))}${domain}`;
}

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
