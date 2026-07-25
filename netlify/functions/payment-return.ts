import type { Config } from '@netlify/functions';
import { db, type Order } from '../lib/db';

/**
 * Точка повернення з WayForPay.
 *
 * Дві проблеми, які тут вирішуються.
 *
 * Перша: WayForPay повертає браузер на returnUrl методом POST, а Netlify
 * на POST до статичного файлу віддає 404. Тому повернення приймає
 * функція й перекидає на сторінку через 303 — цей статус перетворює
 * POST на GET.
 *
 * Друга: query-рядок до нас не доїжджає. Це підтверджено — після оплати
 * жінка бачила нашу ж сторінку з «Сторінку не знайдено», тобто запит
 * дійшов, а ?t= зник. Тому токен передається В ШЛЯХУ адреси:
 * /api/payment-return/<токен>. Шлях платіжні шлюзи не ріжуть.
 *
 * Додатково лишається запасний шлях — пошук замовлення за
 * orderReference з тіла POST. Разом це покриває будь-яку поведінку
 * WayForPay: чи він шле POST з даними, чи робить GET без нічого.
 *
 * Токен — не ключ до оплати, а лише спосіб прочитати результат:
 * оплаченим замовлення робить тільки підписаний вебхук.
 */

const TOKEN_RE = /^[a-f0-9]{48}$/;

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  // 1. Токен зі шляху — основний спосіб.
  let token = url.pathname.split('/').filter(Boolean).pop() || '';

  // 2. Раптом query все ж дійшов — приймаємо і його.
  if (!TOKEN_RE.test(token)) token = url.searchParams.get('t') || '';

  // 3. Останній рубіж: знайти замовлення за orderReference з тіла POST.
  if (!TOKEN_RE.test(token) && req.method === 'POST') {
    const ref = orderReferenceFromBody(await safeText(req));
    if (ref) {
      const { data } = await db()
        .from('orders')
        .select('access_token')
        .eq('order_reference', ref)
        .single<Pick<Order, 'access_token'>>();
      if (data?.access_token) token = data.access_token;
    }
  }

  const resolved = TOKEN_RE.test(token);
  return new Response(null, {
    status: 303,
    headers: {
      location: resolved ? `/thank-you/?t=${token}` : '/thank-you/',
      'cache-control': 'no-store',
    },
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

// Обидва шляхи: з токеном і без — щоб запасні варіанти теж мали куди прийти.
export const config: Config = {
  path: ['/api/payment-return', '/api/payment-return/:token'],
};
