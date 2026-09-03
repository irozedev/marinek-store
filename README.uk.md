# marinek.store — Марафон схуднення для жінок

Односторінковий лендінг марафону (укр.) + юридичні сторінки + сторінка «дякуємо» після оплати.
Next.js 14 (App Router) · TypeScript · Tailwind CSS · повністю статичний (`output: 'export'`).

## Роути

| Route        | Що це                                            |
| ------------ | ------------------------------------------------ |
| `/`          | Лендінг                                          |
| `/oferta`    | Публічний договір (оферта)                       |
| `/privacy`   | Політика конфіденційності                        |
| `/rules`     | Правила користування                             |
| `/thank-you` | Після оплати (noindex, авторедірект у Telegram за `?plan=`) |
| `/payment-failed` | Неуспішна оплата (noindex)                  |

## Запуск локально

```bash
npm install
cp .env.example .env.local   # заповнити значення
npm run dev                  # http://localhost:3000
```

## Environment variables

Усі змінні описані в [`.env.example`](./.env.example):

- `NEXT_PUBLIC_PAY_LINK_STANDARD` / `_CHAT` / `_PERSONAL` — платіжні посилання WayForPay (фолбек: `#tariffs`);
- `NEXT_PUBLIC_TELEGRAM_URL_STANDARD` / `_PREMIUM` — Telegram-канали; `/thank-you?plan=standard|chat|personal` обирає канал;
- `NEXT_PUBLIC_GA_ID` — Google Analytics 4 Measurement ID (`G-…`). GA вантажиться **лише після згоди** «Прийняти всі» в cookie-банері; якщо ID заданий, банер вмикається автоматично;
- `NEXT_PUBLIC_SHOW_COOKIE_BANNER` — примусово показувати банер (`true`/`false`).

Значення `NEXT_PUBLIC_*` вшиваються в білд — після зміни змінних потрібен ребілд.

## Білд

```bash
npm run build   # статичний export → папка out/
```

`out/` можна викласти на будь-який static-хостинг. API-роутів немає.

## Деплой на Vercel (домен marinek.store)

1. Запушити репозиторій на GitHub/GitLab.
2. Vercel → **Add New Project** → імпортувати репозиторій. Фреймворк визначиться автоматично
   (Next.js), команда білду — `next build`.
3. **Settings → Environment Variables**: додати всі змінні з `.env.example` (Production).
4. Задеплоїти. **Settings → Domains** → додати `marinek.store` і `www.marinek.store`;
   у реєстратора домену прописати DNS-записи, які покаже Vercel (A `76.76.21.21` або CNAME
   `cname.vercel-dns.com`).
5. У кожній платіжній кнопці WayForPay («Налаштувати перенаправлення клієнта»):
   - approvedUrl: `https://marinek.store/thank-you?plan=standard` (для «Стандарт»),
     `...?plan=chat` («Чат з учасницями»), `...?plan=personal` («Персональний супровід»);
   - declinedUrl: `https://marinek.store/payment-failed`;
   - увімкнути «Вимкнути відправку POST на returnUrl» (сайт статичний).

## Структура

```
src/
  app/            # роути (App Router)
  components/     # секції лендінгу, LegalLayout, CookieConsent (банер + GA)
  lib/site.ts     # START_DATE, платіжні лінки, дані карток результатів
public/images/    # оптимізовані WebP (hero + results/)
```

Дата старту потоку («03.08») — одна константа `START_DATE` у `src/lib/site.ts`.

## Відомі TODO перед продом

- Заповнити e-mail і телефон ФОП у футері (`src/components/Closing.tsx`) та на юридичних
  сторінках — зараз там плейсхолдери `[вкажіть e-mail]` з дизайн-макета.
- `/privacy` і `/rules` — чернетки (оригінальні дизайн-файли пошкодились при передачі);
  замінити контент 1:1 після відновлення оригіналів.
- Перевірити відповідність фото ↔ імен у секції «Результати учасниць» (`src/lib/site.ts`) —
  деталі в коментарях і в handoff-нотатках.
