/**
 * Забирає редагований контент із Supabase ПЕРЕД збіркою і кладе його поруч
 * із кодом: JSON у src/lib/content.generated.json, фото — у public/uploads.
 * Далі Next.js збирає з ними звичайну статику.
 *
 * Чому саме так, а не запит із браузера. Це лендинг: дата стоїть у першому
 * екрані, фото учасниць — теж вище згину. Рантайм-фетч означав би, що
 * жінка спершу бачить порожні місця, а потім вони стрибають. Плюс сайт
 * перестав би відкриватися, коли Supabase лежить.
 *
 * Через це фото ми ВИКАЧУЄМО, а не лінкуємо на Supabase Storage: інакше
 * кожне фото — це зайвий домен у критичному шляху й залежність від того,
 * чи не заснув безкоштовний проєкт. Після викачки їх роздає CDN Netlify,
 * як і решту статики.
 *
 * ГОЛОВНЕ ПРАВИЛО: цей скрипт не має права зламати збірку. Немає ключів,
 * база не відповіла, повернулась дурня — тихо беремо content.defaults.json
 * (він у гіті разом із фото) і йдемо далі. Впасти тут означало б, що
 * тимчасовий збій у Supabase кладе живий сайт із оплатами.
 */

import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULTS_PATH = join(ROOT, 'src/lib/content.defaults.json');
const OUT_PATH = join(ROOT, 'src/lib/content.generated.json');
const UPLOADS_DIR = join(ROOT, 'public/uploads/results');
const UPLOADS_URL = '/uploads/results';

const BUCKET = 'results';
const DATE_RE = /^\d{2}\.\d{2}$/;
const SAFE_NAME_RE = /^[A-Za-z0-9._-]+$/;

main();

async function main() {
  await loadDotEnv();
  const defaults = JSON.parse(await readFile(DEFAULTS_PATH, 'utf8'));

  let content;
  try {
    content = await fromSupabase(defaults);
  } catch (err) {
    warn(`не вдалося прочитати контент із Supabase: ${err.message}`);
  }

  if (!content) {
    // Локально без .env це нормальний режим роботи, а не помилка.
    console.log('[content] беремо запасний контент із content.defaults.json');
    content = { startDate: defaults.startDate, results: defaults.results };
  }

  await writeFile(OUT_PATH, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
  console.log(
    `[content] старт ${content.startDate}, карток результатів: ${content.results.length}`,
  );
}

async function fromSupabase(defaults) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const auth = { apikey: key, authorization: `Bearer ${key}` };

  const [row] = await api(`${url}/rest/v1/site_content?select=start_date&id=eq.1`, auth);
  const rows = await api(
    `${url}/rest/v1/results?select=name,age,weeks,before_path,after_path,position,created_at` +
      `&order=position.asc,created_at.asc`,
    auth,
  );

  // Дату беремо лише у знайомому форматі. Зіпсована дата в чотирьох
  // місцях вёрстки виглядає гірше, ніж просто стара.
  const startDate = DATE_RE.test(row?.start_date) ? row.start_date : null;
  if (!startDate) warn('дата старту в базі порожня або в дивному форматі — беремо запасну');

  // Порожній список — це майже напевно недокочена міграція або збій,
  // а не свідоме рішення прибрати всі відгуки. Порожня секція
  // «Результати учасниць» на лендингу гірша за старі фото.
  if (!Array.isArray(rows) || rows.length === 0) {
    warn('у базі немає карток результатів — беремо запасні');
    return null;
  }

  await rm(UPLOADS_DIR, { recursive: true, force: true });
  await mkdir(UPLOADS_DIR, { recursive: true });

  const results = [];
  for (const r of rows) {
    try {
      results.push({
        name: String(r.name).trim(),
        age: String(r.age).trim(),
        weeks: String(r.weeks).trim(),
        before: await download(url, auth, r.before_path),
        after: await download(url, auth, r.after_path),
      });
    } catch (err) {
      // Одна битая картка не має валити решту — просто не показуємо її.
      warn(`картку «${r.name}» пропущено: ${err.message}`);
    }
  }

  if (results.length === 0) {
    warn('жодну картку не вдалося викачати — беремо запасні');
    return null;
  }

  return { startDate: startDate ?? defaults.startDate, results };
}

async function api(endpoint, auth) {
  const res = await fetch(endpoint, { headers: auth });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function download(url, auth, path) {
  if (typeof path !== 'string' || !path) throw new Error('порожній шлях до фото');

  // Значення з бази йде у шлях на диску, тож перевіряємо його явно.
  // Адмінка завжди кладе файли пласко, як «<uuid>.webp», тому вимагаємо
  // рівно це й не пробуємо «почистити» щось складніше: шлях із «..» — це
  // не той файл, який ми хочемо скачати, а привід зупинитись.
  if (path !== basename(path) || !SAFE_NAME_RE.test(path)) {
    throw new Error(`підозрілий шлях до фото: ${path}`);
  }

  const name = path;
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${encodeURIComponent(name)}`, {
    headers: auth,
  });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);

  await writeFile(join(UPLOADS_DIR, name), Buffer.from(await res.arrayBuffer()));
  return `${UPLOADS_URL}/${name}`;
}

/**
 * Локально ключі лежать у .env, але його читає Next, а не цей скрипт —
 * ми запускаємось окремим процесом ДО нього. Без цього `npm run dev`
 * мовчки збирав би сайт із запасного контенту, і локально ніколи не було
 * б видно того, що Марина справді відредагувала.
 *
 * На Netlify файлу немає — там змінні вже в оточенні, і ця функція
 * просто нічого не робить. Наявні змінні не перетираємо: оточення
 * головніше за файл.
 */
async function loadDotEnv() {
  let raw;
  try {
    raw = await readFile(join(ROOT, '.env'), 'utf8');
  } catch {
    return;
  }

  for (const line of raw.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match || line.trimStart().startsWith('#')) continue;
    const [, key, value] = match;
    if (process.env[key] === undefined) {
      process.env[key] = value.trim().replace(/^["']|["']$/g, '');
    }
  }
}

function warn(message) {
  console.warn(`[content] ${message}`);
}
