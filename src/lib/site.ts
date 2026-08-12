// ─────────────────────────────────────────────────────────────────────
// Дата старту й картки результатів редагуються Мариною в /admin і лежать
// у Supabase. Сюди вони потрапляють НЕ запитом із браузера, а файлом,
// який scripts/sync-content.mjs пише перед кожною збіркою (див. prebuild
// у package.json). Тобто на сайті це така сама статика, як раніше.
//
// content.generated.json у гіті немає — його щоразу створює скрипт. Якщо
// бази нема під рукою (свіжий клон, локальна робота без ключів, збій
// Supabase), скрипт покладе туди вміст content.defaults.json, і сайт
// збереться зі старим, але цілим контентом.
// ─────────────────────────────────────────────────────────────────────
import content from './content.generated.json';

// Формат ДД.ММ. Зустрічається в hero, тарифах, фінальному CTA, sticky CTA
// і в <title> — саме тому в адмінці стоїть календар, а не текстове поле.
export const START_DATE: string = content.startDate;

// Головне фото першого екрана. Доки Марина не завантажила своє,
// це файл із репозиторію.
export const HERO_IMAGE: string = content.heroImage;

export const SITE_URL = 'https://marinek.store';

// Ціни, платіжні посилання й Telegram-інвайти свідомо ЖИВУТЬ НА СЕРВЕРІ
// (netlify/lib/plans.ts, netlify/functions/*), а не тут. Усе, що лежить
// у цьому файлі, потрапляє в клієнтський бандл і читається з вихідного
// коду сторінки — саме так статичні інвайти раніше були доступні будь-кому.

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || '';

// Банер показується, якщо явно ввімкнений прапорцем АБО якщо підключена аналітика
// (GA ставить cookies → потрібна згода).
export const SHOW_COOKIE_BANNER =
  process.env.NEXT_PUBLIC_SHOW_COOKIE_BANNER === 'true' || Boolean(GA_ID);

export type ResultCard = {
  name: string;
  age: string;
  weeks: string;
  before: string;
  after: string;
};

export const RESULTS: ResultCard[] = content.results;
