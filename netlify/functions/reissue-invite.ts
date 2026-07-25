import type { Config } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { db, type Order } from '../lib/db';
import { PLANS, channelIdForPlan, isPlanId } from '../lib/plans';
import { createSingleUseInvite, revokeInvite } from '../lib/telegram';

/**
 * Перевипуск інвайта з адмінки. Потрібен, коли посилання протермінувалось,
 * загубилось або жінка випадково віддала його комусь іншому.
 *
 * Стара ссилка ГАСИТЬСЯ перед видачею нової — інакше перевипуск лише
 * плодив би дійсні посилання, а сенс усієї схеми в тому, що на одну
 * оплату існує рівно один живий інвайт.
 *
 * Викликати може тільки залогінений адміністратор: JWT з Supabase Auth
 * перевіряється на сервері. Не можна покладатись на те, що кнопка є лише
 * в адмінці — сам ендпоінт публічний, і його можна смикнути напряму.
 */

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'unauthorized' }, 401);

  // Перевіряємо JWT публічним ключем — Supabase скаже, чи він справжній
  // і не протермінований.
  const auth = createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    { auth: { persistSession: false } },
  );
  const { data: user, error: authErr } = await auth.auth.getUser(token);
  if (authErr || !user?.user) return json({ error: 'unauthorized' }, 401);

  let orderId: unknown;
  try {
    ({ orderId } = (await req.json()) as { orderId?: unknown });
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  if (typeof orderId !== 'string') return json({ error: 'bad_request' }, 400);

  const { data: order } = await db()
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single<Order>();

  if (!order) return json({ error: 'not_found' }, 404);
  // Перевипускати можна лише те, що реально оплачене.
  if (order.status !== 'paid') return json({ error: 'not_paid' }, 409);
  if (!isPlanId(order.plan)) return json({ error: 'bad_plan' }, 409);

  const plan = PLANS[order.plan];
  const chatId = channelIdForPlan(plan);

  if (order.invite_link) {
    try {
      await revokeInvite(chatId, order.invite_link);
    } catch (err) {
      // Посилання могло бути відкликане раніше або вручну — це не привід
      // блокувати видачу нового.
      console.warn('reissue: стару ссилку погасити не вдалося', order.order_reference, err);
    }
  }

  const { link, expiresAt } = await createSingleUseInvite(chatId, {
    name: `${order.order_reference}-r`,
  });

  await db()
    .from('orders')
    .update({
      invite_link: link,
      invite_issued_at: new Date().toISOString(),
      invite_expires_at: expiresAt.toISOString(),
    })
    .eq('id', order.id);

  console.log(`reissue: ${order.order_reference} — ${user.user.email}`);
  return json({ inviteLink: link, expiresAt: expiresAt.toISOString() });
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} не заданий`);
  return value;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const config: Config = { path: '/api/reissue-invite' };
