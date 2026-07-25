import type { Config } from '@netlify/functions';
import { db, type Order } from '../lib/db';

/**
 * Точка повернення з WayForPay.
 *
 * Проблема перша: WayForPay повертає браузер на returnUrl методом POST,
 * а Netlify на POST до статичного файлу віддає 404. Тому повернення
 * приймає функція й перекидає на сторінку через 303 — цей статус
 * перетворює POST на GET.
 *
 * Проблема друга: судячи з поведінки, query-рядок у returnUrl до нас не
 * доїжджає, тож ?t= покладатись не можна. Але WayForPay кладе в тіло
 * POST усі дані транзакції, зокрема orderReference — за ним токен
 * дістається з бази. Тому працюємо двома шляхами: беремо ?t=, якщо він
 * є, інакше шукаємо замовлення за orderReference.
 *
 * Токен у відповіді — не ключ до оплати, а лише спосіб прочитати
 * результат: оплаченим замовлення робить тільки підписаний вебхук.
 */

const TOKEN_RE = /^[a-f0-9]{48}$/;

export default async (req: Request): Promise<Response> => {
  let token = new URL(req.url).searchParams.get('t') || '';

  // Документація WayForPay не описує, ні яким методом він повертає
  // браузер, ні чи зберігає query. Тому пишемо в лог те, що реально
  // прийшло: якщо знову не спрацює, розбиратись треба за даними, а не
  // за здогадками, і ще одна справжня оплата на це не знадобиться.
  const body = req.method === 'POST' ? await safeText(req) : '';
  console.log('payment-return:', req.method, req.url, '| body:', body.slice(0, 500) || '(порожнє)');

  if (!TOKEN_RE.test(token)) {
    const ref = orderReferenceFromBody(body);
    if (ref) {
      const { data } = await db()
        .from('orders')
        .select('access_token')
        .eq('order_reference', ref)
        .single<Pick<Order, 'access_token'>>();
      if (data?.access_token) token = data.access_token;
    }
  }

  const target = TOKEN_RE.test(token) ? `/thank-you/?t=${token}` : '/thank-you/';
  if (!TOKEN_RE.test(token)) {
    // Не мовчазний збій: без цього рядка не зрозуміти, чому жінка
    // побачила порожню сторінку замість посилання.
    console.warn('payment-return: не вдалося визначити замовлення', req.method, req.url);
  }

  return new Response(null, {
    status: 303,
    headers: { location: target, 'cache-control': 'no-store' },
  });
};

async function safeText(req: Request): Promise<string> {
  try {
    return await req.text();
  } catch {
    return '';
  }
}

/** WayForPay шле або form-urlencoded, або JSON — інколи JSON в імені поля. */
function orderReferenceFromBody(raw: string): string | null {
  if (!raw) return null;

  try {
    const asJson = JSON.parse(raw) as { orderReference?: string };
    if (asJson.orderReference) return asJson.orderReference;
  } catch {
    // не JSON — розбираємо як форму
  }

  const params = new URLSearchParams(raw);
  const direct = params.get('orderReference');
  if (direct) return direct;

  // Варіант, коли весь JSON лежить у ІМЕНІ першого поля.
  const firstKey = params.keys().next().value;
  if (firstKey) {
    try {
      const parsed = JSON.parse(firstKey) as { orderReference?: string };
      if (parsed.orderReference) return parsed.orderReference;
    } catch {
      /* нічого не вдалося витягти */
    }
  }
  return null;
}

export const config: Config = { path: '/api/payment-return' };
