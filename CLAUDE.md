# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`marinek.store` — одностраничный лендинг марафона похудения для женщин (укр. язык) + юридические страницы + страница «дякуємо» после оплаты. Next.js 14 (App Router), TypeScript, Tailwind CSS.

**Критично: сайт полностью статический (`output: 'export'` в [next.config.mjs](next.config.mjs))**. Это значит:
- Next.js API-роуты (`route.ts`) **не работают** — сервера нет вообще, всё собирается в статические файлы в `out/`.
- Любая серверная логика (webhook-и, проверка платежей, генерация чего-либо на лету) должна жить **вне** этого Next.js-приложения — например, как Netlify Functions в том же Netlify-сайте (см. ниже).
- `images: { unoptimized: true }` — нет серверной оптимизации картинок, все фото заранее сжаты в WebP (`public/images/`).

## Хостинг и деплой

- **Netlify** ([netlify.toml](netlify.toml)): `command = "npm run build"`, `publish = "out"`.
- Значения `NEXT_PUBLIC_*` вшиваются в билд на этапе сборки — после смены env-переменных нужен **ребилд**, а не просто рестарт.
- Домен: `marinek.store`.

## Команды

```bash
npm install
cp .env.example .env.local   # заполнить значения перед первым запуском
npm run dev                  # http://localhost:3000
npm run build                 # статический export → папка out/
npm run lint
```

Тестов в проекте нет.

## Оплата (WayForPay) — как это устроено сейчас

Оплата идёт через готовые «платіжні кнопки» WayForPay (прямые ссылки из личного кабинета мерчанта, кабинет → «Платіжні кнопки» → «Посилання»), без своего бэкенда:

- `PAY_LINKS` в [src/lib/site.ts](src/lib/site.ts) — просто ссылки из env (`NEXT_PUBLIC_PAY_LINK_STANDARD/_CHAT/_PERSONAL`), фолбек — якорь `#tariffs`.
- В кабинете WayForPay для каждой кнопки настроен `approvedUrl` → редирект на `/thank-you?plan=standard|chat|personal`, `declinedUrl` → `/payment-failed`.
- **Никакой серверной проверки оплаты нет.** `/thank-you?plan=X` — это просто чтение query-параметра из URL браузера; теоретически это может открыть кто угодно вручную, без реальной оплаты. Если когда-нибудь понадобится настоящая верификация (например, генерация уникальных Telegram-инвайтов на юзера) — нужен вебхук на `serviceUrl` от WayForPay с проверкой HMAC_MD5-подписи (`merchantSecretKey`), а поскольку сайт статический — это будет отдельная Netlify Function, не Next.js route.

## Telegram-редирект — три тарифа, ДВА канала

Тарифов три (Стандарт / Чат з учасницями / Персональний супровід), но Telegram-каналов два — «Чат» и «Персональний супровід» ведут в один и тот же (премиум/VIP) канал:

```
telegramUrlForPlan(plan):
  standard         → TELEGRAM_URLS.standard
  chat, personal   → TELEGRAM_URLS.premium (фолбек на standard, если premium не задан)
  всё остальное    → '' (пустая строка → страница показывает 404)
```

Логика в [src/lib/site.ts](src/lib/site.ts), инвайты — `tg://join?invite=HASH` из env (`NEXT_PUBLIC_TELEGRAM_URL_STANDARD` / `_PREMIUM`). В обоих каналах должны быть включены «Заявки на вступ» (join requests) — это единственная защита от расшаривания статичной ссылки, раз уникальных ссылок на юзера нет.

### Логика редиректа в [src/components/ThankYouCard.tsx](src/components/ThankYouCard.tsx)

Сначала `isValidPlan(plan)` (`VALID_PLANS = ['standard','chat','personal']` в site.ts): без `?plan=` или с неизвестным значением компонент рендерит `<NotFound />` — экран 404, никакого редиректа. Это чтобы `/thank-you` не был публично осмысленной страницей для того, кто зашёл на неё просто так.

Для валидного плана — авторедирект через 3.5 с (`window.location.href = tgUrl`) плюс кнопка «Перейти в Telegram →» для ручного перехода.

`useSearchParams` требует обёртки в `<Suspense>` при статическом рендере — она есть в экспортируемом `ThankYouCard`, не убирать.

**Известная слабость:** `tg://` открывает только установленное приложение и молча ничего не делает, если Telegram не установлен или диплинк заблокирован (типично для встроенных браузеров Instagram/TikTok) — пользователь остаётся на странице с работающей кнопкой, которая тоже ничего не даст. Веб-фолбека на `t.me` намеренно нет: в июле 2026 домен `t.me` был недоступен из-за проблем у регистратора `.me`. Если фолбек будете возвращать — ведите на резервный домен (`telegram.me`) и лучше через env-переменную, а не хардкодом.

## Структура

```
src/
  app/            # роуты (App Router): /, /oferta, /privacy, /rules, /thank-you, /payment-failed
  components/     # секции лендинга, LegalLayout, CookieConsent (банер + GA), ThankYouCard
  lib/site.ts     # START_DATE, платёжные/telegram-ссылки, RESULTS (данные карточек)
```

Дата старта потока («03.08») — одна константа `START_DATE` в `src/lib/site.ts`, встречается в hero, тарифах, финальном CTA и sticky CTA. Дата переносилась уже дважды — меняется только здесь, по всему сайту подтянется само.

## Cookie-банер / GA4

[src/components/CookieConsent.tsx](src/components/CookieConsent.tsx): сайт сам по себе не собирает персональные данные, поэтому банер по умолчанию выключен. Как только задан `NEXT_PUBLIC_GA_ID`, банер включается автоматически (`SHOW_COOKIE_BANNER`), но сами GA-скрипты монтируются **только** после согласия «Прийняти всі» (выбор хранится в `localStorage['mx-cookie-consent']`).

## Известные TODO (из README, ещё не сделано)

- В футере ([src/components/Closing.tsx](src/components/Closing.tsx)) e-mail уже заполнен (`marynabrianyk@gmail.com`), но в [src/app/privacy/page.tsx](src/app/privacy/page.tsx) всё ещё висит плейсхолдер `[вкажіть e-mail]`.
- `/privacy` и `/rules` — черновики (оригинальные дизайн-файлы повреждены при передаче); заменить контентом 1:1 после восстановления оригиналов.
- Проверить соответствие фото ↔ имён в секции «Результати учасниць» (`RESULTS` в `src/lib/site.ts`).
