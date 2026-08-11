import type { Config } from '@netlify/functions';
import { db, type Order } from '../lib/db';
import { PLANS, isPlanId } from '../lib/plans';
import { sendInviteEmail } from '../lib/email';

/**
 * «Не отримали листа?» — повторна відправка вже виданого інвайта.
 *
 * Навіщо: лист тепер ЄДИНИЙ канал видачі, а він не завжди долітає. На
 * живому тесті 12.08.2026 лист від нового домену пішов у «Спам» на iCloud,
 * і це не дрібниця: 16 з 18 оплат зроблені через Apple Pay, чотири
 * покупчині з десяти — на @icloud.com. Тобто саме та пошта, де лист
 * губиться, і є в аудиторії основною.
 *
 * Чому це безпечно, хоч ендпоінт і відкритий: ми нічого не показуємо і
 * нікуди не пересилаємо. Лист іде РІВНО на ту адресу, яка вже записана в
 * оплаченому замовленні, і містить те саме посилання, що й перший раз.
 * Знання чужої пошти не дає нічого, чого не давав перший лист.
 *
 * Відповідь однакова завжди — і коли замовлення знайшлося, і коли ні.
 * Інакше форма перетворилась би на перевірку «чи купувала ця жінка», а це
 * чужа приватна інформація.
 *
 * Захист від закидання чужої скриньки листами: якщо лист за цим
 * замовленням уже йшов менш ніж 5 хвилин тому, мовчки нічого не робимо.
 * Лічильник у пам'яті тут не годиться — serverless не переживає холодний
 * старт, — тому throttle тримається на email_sent_at у базі.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RESEND_COOLDOWN_MS = 5 * 60 * 1000;

type Row = Pick<Order, 'id' | 'plan' | 'email' | 'invite_link' | 'invite_expires_at' | 'email_sent_at'>;

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let email: unknown;
  try {
    ({ email } = (await req.json()) as { email?: unknown });
  } catch {
    return json({ error: 'bad_json' }, 400);
  }

  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return json({ error: 'bad_email' }, 400);
  }

  try {
    await resend(email.trim().toLowerCase());
  } catch (err) {
    // Навіть якщо відправка впала — не розповідаємо про це назовні, інакше
    // з відповіді можна буде вгадати, чи існує замовлення.
    console.error('resend-invite: не вдалося надіслати', err);
  }

  return json({ ok: true });
};

async function resend(email: string): Promise<void> {
  // Найсвіжіше оплачене замовлення з уже виданим інвайтом.
  const { data } = await db()
    .from('orders')
    .select('id, plan, email, invite_link, invite_expires_at, email_sent_at')
    .eq('status', 'paid')
    .ilike('email', email)
    .not('invite_link', 'is', null)
    .order('paid_at', { ascending: false })
    .limit(1);

  const order = (data as Row[] | null)?.[0];
  if (!order || !order.invite_link || !order.email || !isPlanId(order.plan)) return;

  if (order.email_sent_at && Date.now() - Date.parse(order.email_sent_at) < RESEND_COOLDOWN_MS) {
    return; // Щойно надсилали — не даємо завалити скриньку.
  }

  await sendInviteEmail({
    to: order.email,
    planTitle: PLANS[order.plan].productName,
    inviteLink: order.invite_link,
    expiresAt: order.invite_expires_at ? new Date(order.invite_expires_at) : new Date(Date.now() + 7 * 864e5),
  });

  await db().from('orders').update({ email_sent_at: new Date().toISOString() }).eq('id', order.id);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export const config: Config = { path: '/api/resend-invite' };
