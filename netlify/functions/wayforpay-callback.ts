import type { Config } from '@netlify/functions';
import { db, type Order } from '../lib/db';
import { sendInviteEmail } from '../lib/email';
import { PLANS, channelIdForPlan, isPlanId } from '../lib/plans';
import { createSingleUseInvite, revokeInvite } from '../lib/telegram';
import {
  buildCallbackResponse,
  verifyCallbackSignature,
  type WayForPayCallback,
} from '../lib/wayforpay';

/**
 * Вебхук WayForPay (serviceUrl). Єдине місце, де замовлення стає оплаченим
 * і де випускається інвайт — сторінка /thank-you нічого не вирішує, вона
 * лише показує результат.
 *
 * WayForPay повторює запит до 4 діб, поки не отримає коректно підписану
 * відповідь. Звідси два наслідки:
 *   1. Обробник мусить бути ІДЕМПОТЕНТНИМ — інакше на кожен ретрай
 *      з'явиться ще один дійсний одноразовий інвайт.
 *   2. Відповідати 'accept' треба навіть коли Telegram чи пошта впали,
 *      інакше вебхук ходитиме днями. Замовлення при цьому лишиться
 *      paid без invite_link — така пара видна в адмінці.
 */

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const body = await parseBody(req);
  if (!body) return new Response('bad request', { status: 400 });

  if (!verifyCallbackSignature(body)) {
    console.warn('callback: невірний підпис', body.orderReference);
    return new Response('bad signature', { status: 400 });
  }

  const { data: order } = await db()
    .from('orders')
    .select('*')
    .eq('order_reference', body.orderReference)
    .single<Order>();

  if (!order) {
    console.warn('callback: невідоме замовлення', body.orderReference);
    return new Response('unknown order', { status: 404 });
  }

  // Підпис підтверджує лише те, що запит від WayForPay. Суму все одно
  // звіряємо зі збереженою: підписаний запит на іншу суму — не наш платіж.
  const amountMatches = Math.abs(Number(body.amount) - Number(order.amount)) < 0.01;
  if (!amountMatches || body.currency !== order.currency) {
    console.error('callback: сума/валюта не збігаються', {
      order: order.order_reference,
      expected: `${order.amount} ${order.currency}`,
      got: `${body.amount} ${body.currency}`,
    });
    return new Response('amount mismatch', { status: 400 });
  }

  const newStatus = mapStatus(body.transactionStatus);

  await db()
    .from('orders')
    .update({
      status: newStatus,
      transaction_status: body.transactionStatus,
      reason_code: String(body.reasonCode ?? ''),
      email: body.email ?? order.email,
      phone: body.phone ?? order.phone,
      client_name: body.clientName ?? order.client_name,
      paid_at: body.transactionStatus === 'Approved' ? new Date().toISOString() : order.paid_at,
      raw_callback: body,
    })
    .eq('id', order.id);

  if (newStatus === 'paid') {
    await issueInvite(order, body.email ?? order.email);
  } else if (newStatus !== 'pending' && order.invite_link) {
    // Гроші повернені або платіж скасований — доступ має зникнути разом
    // із ними. Інакше виходить безкоштовний вхід: оплатити, отримати
    // посилання, а потім оформити повернення.
    await revokeIssuedInvite(order, newStatus);
  }

  return json(buildCallbackResponse(body.orderReference));
};

/**
 * Гасить видане посилання після повернення/скасування.
 *
 * ВАЖЛИВО про межі: це закриває лише випадок, коли жінка ще не встигла
 * увійти. Якщо вона вже в каналі, відкликання посилання її звідти не
 * виганяє — щоб виганяти, треба знати її Telegram-акаунт, а для цього
 * потрібна підписка на події chat_member. Поки що такий випадок
 * розбирається вручну через адмінку.
 */
async function revokeIssuedInvite(order: Order, newStatus: Order['status']): Promise<void> {
  if (!isPlanId(order.plan) || !order.invite_link) return;
  try {
    await revokeInvite(channelIdForPlan(PLANS[order.plan]), order.invite_link);
    // Саме newStatus, а не order.status: у order лежить стан ДО оновлення.
    console.log(`callback: інвайт відкликано після ${newStatus} — ${order.order_reference}`);
  } catch (err) {
    // Могло бути відкликане раніше (ретрай вебхука) — не привід падати.
    console.warn('callback: не вдалося відкликати інвайт', order.order_reference, err);
  }
}

/**
 * Видає інвайт рівно один раз. Захист від паралельних ретраїв — умовний
 * UPDATE: invite_issued_at виставляється тільки якщо він ще порожній,
 * і той виклик, який його «застовпив», єдиний іде далі до Telegram.
 */
async function issueInvite(order: Order, email: string | null): Promise<void> {
  if (order.invite_link) return;
  if (!isPlanId(order.plan)) return;

  const now = new Date().toISOString();
  const { data: claimed } = await db()
    .from('orders')
    .update({ invite_issued_at: now })
    .eq('id', order.id)
    .is('invite_issued_at', null)
    .select('id')
    .maybeSingle();

  if (!claimed) return; // Інший ретрай уже цим займається.

  const plan = PLANS[order.plan];

  try {
    const { link, expiresAt } = await createSingleUseInvite(channelIdForPlan(plan), {
      name: order.order_reference,
    });

    await db()
      .from('orders')
      .update({ invite_link: link, invite_expires_at: expiresAt.toISOString() })
      .eq('id', order.id);

    if (email) {
      try {
        await sendInviteEmail({
          to: email,
          planTitle: plan.productName,
          inviteLink: link,
          expiresAt,
        });
        await db().from('orders').update({ email_sent_at: new Date().toISOString() }).eq('id', order.id);
      } catch (err) {
        // Лист — страховка, а не основний канал: посилання вже є на /thank-you.
        console.error('callback: лист не пішов', order.order_reference, err);
      }
    }
  } catch (err) {
    // Знімаємо «застовплення», щоб наступний ретрай WayForPay спробував знову.
    await db().from('orders').update({ invite_issued_at: null }).eq('id', order.id);
    console.error('callback: інвайт не створений', order.order_reference, err);
  }
}

function mapStatus(transactionStatus: string): Order['status'] {
  switch (transactionStatus) {
    case 'Approved':
      return 'paid';
    case 'Declined':
    case 'Expired':
    case 'Voided':
      return 'declined';
    case 'Refunded':
      return 'refunded';
    default:
      return 'pending'; // InProcessing, Pending — чекаємо наступного вебхука.
  }
}

/**
 * WayForPay залежно від інтеграції шле або чистий JSON, або
 * form-urlencoded, де весь JSON лежить у ІМЕНІ першого поля.
 */
async function parseBody(req: Request): Promise<WayForPayCallback | null> {
  const raw = await req.text();
  if (!raw) return null;

  try {
    return JSON.parse(raw) as WayForPayCallback;
  } catch {
    const firstKey = new URLSearchParams(raw).keys().next().value;
    if (!firstKey) return null;
    try {
      return JSON.parse(firstKey) as WayForPayCallback;
    } catch {
      return null;
    }
  }
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const config: Config = { path: '/api/wayforpay-callback' };
