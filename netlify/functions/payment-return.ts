import type { Config } from '@netlify/functions';

/**
 * Точка повернення з WayForPay.
 *
 * Навіщо потрібен цей проміжний крок: WayForPay повертає браузер на
 * returnUrl методом POST — разом із даними транзакції. Netlify на POST
 * до статичного файлу відповідає 404, тож жінка після успішної оплати
 * бачила порожню сторінку помилки, хоча гроші вже списані й інвайт
 * виданий. Знайдено на першому справжньому платежі: підробленим
 * вебхуком це не відтворюється, бо там немає браузерного повернення.
 *
 * 303 See Other — саме той статус, який перетворює POST на GET, тож
 * далі сторінка відкривається звичайним способом і читає ?t= як завжди.
 */

export default async (req: Request): Promise<Response> => {
  const token = new URL(req.url).searchParams.get('t') || '';

  // Токен підставляється в адресу, тому пропускаємо лише свій формат —
  // щоб через цей редірект не можна було нікуди відправити користувача.
  const safe = /^[a-f0-9]{48}$/.test(token) ? token : '';
  const target = safe ? `/thank-you/?t=${safe}` : '/thank-you/';

  return new Response(null, {
    status: 303,
    headers: { location: target, 'cache-control': 'no-store' },
  });
};

export const config: Config = { path: '/api/payment-return' };
