import type { Config } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { db } from '../lib/db';

/**
 * «Опублікувати» з кабінету: перевіряємо, що просить справді Марина, і
 * смикаємо build hook Netlify — сайт перезбирається зі свіжим контентом.
 *
 * Чому це функція, а не запит із браузера напряму. Адреса build hook —
 * це і є право запустити збірку: хто її знає, той може запускати їх
 * скільки завгодно. У клієнтському бандлі вона була б видна будь-кому
 * у вихідному коді сторінки — рівно так, як колись витекли статичні
 * інвайти. Тому адреса лежить в env функції, а браузер приносить сюди
 * лише свій токен входу.
 *
 * Пауза між збірками — не абстрактна обережність. Тариф Netlify дає
 * 300 хвилин збірки на місяць, у липні вони вже закінчувалися, і тоді
 * сайт не можна було оновити взагалі. Дві збірки поспіль з різницею в
 * секунди — це подвійна витрата за один і той самий результат.
 */

const COOLDOWN_MS = 3 * 60 * 1000;

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json({ message: 'method_not_allowed' }, 405);

  const hook = process.env.NETLIFY_BUILD_HOOK_URL;
  if (!hook) {
    console.error('publish-site: NETLIFY_BUILD_HOOK_URL не заданий');
    return json({ message: 'Оновлення сайту ще не налаштоване. Напишіть розробнику.' }, 500);
  }

  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token || !(await isSignedIn(token))) {
    return json({ message: 'Схоже, ви вийшли з кабінету. Увійдіть ще раз.' }, 401);
  }

  const { data } = await db()
    .from('site_content')
    .select('published_at')
    .eq('id', 1)
    .maybeSingle();

  const last = data?.published_at ? Date.parse(data.published_at) : 0;
  const wait = COOLDOWN_MS - (Date.now() - last);
  if (wait > 0) {
    return json(
      {
        message: `Оновлення вже запущене. Зачекайте ${Math.ceil(wait / 60000)} хв — сайт саме перезбирається.`,
      },
      429,
    );
  }

  const res = await fetch(hook, { method: 'POST' });
  if (!res.ok) {
    console.error('publish-site: build hook відповів', res.status, await res.text());
    return json({ message: 'Netlify не прийняв запит на оновлення. Спробуйте за хвилину.' }, 502);
  }

  // Позначку ставимо тільки після успішного запуску: інакше кабінет
  // сказав би «все опубліковано», хоча збірка навіть не почалася.
  await db().from('site_content').update({ published_at: new Date().toISOString() }).eq('id', 1);

  return json({ ok: true });
};

/**
 * Перевіряємо токен у самого Supabase, а не розбираємо JWT руками.
 * Так підпис, термін дії та відкликані сесії перевіряються за нас —
 * а саме на самописному розборі JWT зазвичай і помиляються.
 */
async function isSignedIn(token: string): Promise<boolean> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY не задані');

  const { data, error } = await createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).auth.getUser(token);

  return Boolean(data?.user) && !error;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export const config: Config = { path: '/api/publish-site' };
