import type { Config } from '@netlify/functions';
import { db, type Order } from '../lib/db';
import { verifyCallbackSignature, type WayForPayCallback } from '../lib/wayforpay';

/**
 * Точка повернення з WayForPay: вирішує, куди відправити людину після
 * оплати — на /thank-you чи на /payment-failed. Сторінки статичні й самі
 * нічого не знають, тому вибір робиться тут.
 *
 * ЩО ПІДТВЕРДЖЕНО ДОКУМЕНТАЦІЄЮ (перевірено 04.08.2026):
 *
 * - Окремого `declineUrl` у Purchase API НЕМА. Відмову ніяк не відправити
 *   на власну адресу — розводити успіх і невдачу можна лише в себе.
 * - На returnUrl WayForPay повертає браузер методом POST і кладе в тіло
 *   результат платежу.
 * - Тіло ПІДПИСАНЕ тією ж HMAC_MD5, що й вебхук:
 *   merchantAccount;orderReference;amount;currency;authCode;cardPan;
 *   transactionStatus;reasonCode. Їхній власний плагін для WooCommerce
 *   цю підпис перевіряє і без неї платіж не зараховує.
 *
 * Звідси три рівні довіри, від найнадійнішого:
 *   1. підпис на тілі зійшлася → вірімо transactionStatus в обидва боки;
 *   2. підпису нема → дивимось статус замовлення в базі (його ставить
 *      підписаний вебхук) за токеном або orderReference;
 *   3. нічого не впізнали → /thank-you, чий текст написаний так, щоб не
 *      брехати навіть коли оплати насправді не було.
 *
 * Непідписаному тілу вірімо лише в бік невдачі: інакше будь-хто надіслав
 * би transactionStatus=Approved і побачив сторінку успіху.
 *
 * Технічна пастка, заради якої функція взагалі існує: Netlify на POST до
 * статичного файлу віддає 404, тому повернення приймає функція й робить
 * 303 — цей статус перетворює POST на GET. А ще WayForPay ріже query, тож
 * токен передається В ШЛЯХУ: /api/payment-return/<токен>.
 */

const TOKEN_RE = /^[a-f0-9]{48}$/;

/** Успіх. Кошти є або гарантовано будуть списані. */
const APPROVED = new Set(['approved']);

/**
 * Грошей немає. `Pending`, `InProcessing` і `WaitingAuthComplete` сюди
 * НЕ входять свідомо — це «ще думаємо», і показати людині «оплата не
 * пройшла» на них було б неправдою.
 */
const FAILED = new Set(['declined', 'expired', 'refunded', 'voided', 'refundinprocessing']);

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  // 1. Токен зі шляху — основний спосіб.
  let token = url.pathname.split('/').filter(Boolean).pop() || '';

  // 2. Раптом query все ж дійшов — приймаємо і його.
  if (!TOKEN_RE.test(token)) token = url.searchParams.get('t') || '';

  const raw = req.method === 'POST' ? await safeText(req) : '';
  const fields = raw ? parseBody(raw) : null;
  const failed = await isFailed(token, fields);

  // Діагностика: що саме WayForPay сюди присилає. Логи функцій Netlify через
  // CLI приходять з порожнім повідомленням — перевірено, часу на них не
  // витрачати. Тому пишемо в базу: наступний живий платіж сам покаже, чи
  // доїжджає токен у шляху і чи приходить тіло. Ніколи не ламає повернення:
  // якщо запис упаде, людину все одно перекине куди треба.
  try {
    await db().from('payment_returns').insert({
      method: req.method,
      path: url.pathname,
      content_type: req.headers.get('content-type'),
      raw_body: raw.slice(0, 8000),
      token_found: TOKEN_RE.test(token),
      routed_to: failed ? '/payment-failed/' : '/thank-you/',
    });
  } catch (err) {
    console.error('payment-return: не вдалося записати діагностику', err);
  }

  // Токен далі не передаємо: сторінка його більше не читає, а зайвим даним
  // нема чого лишатися в історії браузера й у реферерах.
  return new Response(null, {
    status: 303,
    headers: {
      location: failed ? '/payment-failed/' : '/thank-you/',
      'cache-control': 'no-store',
    },
  });
};

async function isFailed(token: string, fields: Record<string, string> | null): Promise<boolean> {
  const status = fields?.transactionStatus?.toLowerCase() ?? null;

  // Рівень 1 — підписане тіло. Найнадійніше джерело, віримо в обидва боки.
  if (fields && fields.merchantSignature && signatureOk(fields)) {
    if (status && APPROVED.has(status)) return false;
    if (status && FAILED.has(status)) return true;
    return false; // Pending / InProcessing — ще не відмова.
  }

  // Рівень 2 — статус замовлення в базі, поставлений підписаним вебхуком.
  const resolvedToken = TOKEN_RE.test(token)
    ? token
    : await tokenByOrderReference(fields?.orderReference ?? null);

  if (resolvedToken) {
    const { data } = await db()
      .from('orders')
      .select('status')
      .eq('access_token', resolvedToken)
      .single<Pick<Order, 'status'>>();

    if (data?.status === 'paid') return false;
    if (data?.status === 'declined' || data?.status === 'refunded') return true;
    // pending: вебхук ще не дійшов — звична гонка, не вгадуємо.
  }

  // Рівень 3 — непідписане тіло, тільки як сигнал про невдачу.
  return status ? FAILED.has(status) : false;
}

function signatureOk(fields: Record<string, string>): boolean {
  try {
    return verifyCallbackSignature(fields as unknown as WayForPayCallback);
  } catch {
    // Секрет не заданий або поля неповні — вважаємо, що підпису нема.
    return false;
  }
}

async function tokenByOrderReference(ref: string | null): Promise<string | null> {
  if (!ref) return null;
  const { data } = await db()
    .from('orders')
    .select('access_token')
    .eq('order_reference', ref)
    .single<Pick<Order, 'access_token'>>();
  return data?.access_token ?? null;
}

async function safeText(req: Request): Promise<string> {
  try {
    return await req.text();
  } catch {
    return '';
  }
}

/**
 * WayForPay шле або form-urlencoded, або JSON — а інколи весь JSON
 * приїжджає як ім'я єдиного поля форми. Повертаємо плаский набір рядків:
 * підпис рахується саме по рядках, тож нічого не приводимо до чисел.
 */
function parseBody(raw: string): Record<string, string> | null {
  if (!raw) return null;

  const flatten = (o: unknown): Record<string, string> | null => {
    if (!o || typeof o !== 'object') return null;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (v !== null && v !== undefined && typeof v !== 'object') out[k] = String(v);
    }
    return Object.keys(out).length ? out : null;
  };

  try {
    const fromJson = flatten(JSON.parse(raw));
    if (fromJson) return fromJson;
  } catch {
    // не JSON — розбираємо як форму
  }

  const params = new URLSearchParams(raw);
  const fromForm: Record<string, string> = {};
  // forEach, а не for..of: tsconfig сайту цілиться нижче за es2015 і
  // ітерувати URLSearchParams напряму не дає.
  params.forEach((v, k) => {
    fromForm[k] = v;
  });

  if (fromForm.orderReference || fromForm.transactionStatus) return fromForm;

  const firstKey = params.keys().next().value;
  if (firstKey) {
    try {
      const nested = flatten(JSON.parse(firstKey));
      if (nested) return nested;
    } catch {
      /* нічого не вдалося витягти */
    }
  }
  return Object.keys(fromForm).length ? fromForm : null;
}

// Обидва шляхи: з токеном і без — щоб запасні варіанти теж мали куди прийти.
export const config: Config = {
  path: ['/api/payment-return', '/api/payment-return/:token'],
};
