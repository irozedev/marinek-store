// Єдина константа дати старту — зустрічається в hero, тарифах, фінальному CTA і sticky CTA.
export const START_DATE = '03.08';

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

export const RESULTS: ResultCard[] = [
  {
    name: 'Марія',
    age: '26 років',
    weeks: '8 тижнів марафону',
    before: '/images/results/maria-before.webp',
    after: '/images/results/maria-after.webp',
  },
  {
    name: 'Ірина',
    age: '23 роки',
    weeks: '12 тижнів марафону',
    before: '/images/results/iryna-before.webp',
    after: '/images/results/iryna-after.webp',
  },
  {
    name: 'Наіма',
    age: '36 років',
    weeks: '14 тижнів марафону',
    before: '/images/results/naima-before.webp',
    after: '/images/results/naima-after.webp',
  },
  {
    name: "Мар'яна",
    age: '34 роки',
    weeks: '10 тижнів марафону',
    before: '/images/results/mariana-before.webp',
    after: '/images/results/mariana-after.webp',
  },
  {
    name: 'Діана',
    age: '26 років',
    weeks: '8 тижнів марафону',
    before: '/images/results/diana-before.webp',
    after: '/images/results/diana-after.webp',
  },
];
