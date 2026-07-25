'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Сторінка після оплати. WayForPay returnUrl веде сюди з ?t=<access_token>,
 * який видала /api/create-payment.
 *
 * Токен — не пароль від доступу, а лише ключ для читання результату:
 * оплаченим замовлення робить ТІЛЬКИ підписаний вебхук WayForPay. Тому
 * відкрити цю сторінку вручну й отримати інвайт без оплати не вийде —
 * на неоплачене замовлення інвайта просто немає.
 *
 * Вебхук нерідко приходить пізніше за редірект користувача, тому статус
 * опитуємо, а не читаємо один раз: побачити «ще обробляється» — нормально.
 */

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 40_000;

type InviteResponse = {
  status: 'pending' | 'paid' | 'declined' | 'refunded';
  plan: string;
  inviteLink: string | null;
  inviteAppLink: string | null;
  expiresAt: string | null;
};

const CARD =
  'relative w-full max-w-[440px] overflow-hidden rounded-28 bg-[linear-gradient(160deg,#C915A0_0%,#E93CB0_50%,#8A2BE2_100%)] px-[26px] py-10 text-center';

/**
 * Стан «замовлення не знайдено». Раніше тут була гола 404, але сюди
 * потрапляє не лише випадковий відвідувач: якщо повернення з WayForPay
 * колись знову зламається, на цю сторінку прийде жінка, яка щойно
 * заплатила. Показувати їй помилку — найгірше, що можна зробити, тому
 * даємо робочий шлях далі: лист і адресу для звернення.
 *
 * Доступу це не відкриває — посилання видається тільки за валідним
 * токеном, а токен існує лише для оплаченого замовлення.
 */
function OrderNotFound() {
  return (
    <div className={CARD}>
      <h1 className="relative m-0 mb-3 font-display text-[24px] font-black leading-[1.2] text-white">
        Не знайшли ваше замовлення
      </h1>
      <p className="relative m-0 mb-4 text-[15px] leading-[1.5] text-white/90">
        Якщо ви щойно оплатили — посилання на канал уже надіслане на вашу пошту. Перевірте також
        папку «Спам».
      </p>
      <p className="relative m-0 text-[13.5px] leading-[1.5] text-white/75">
        Листа немає? Напишіть на{' '}
        <a href="mailto:marynabrianyk@gmail.com" className="font-bold text-lime underline">
          marynabrianyk@gmail.com
        </a>{' '}
        — відкриємо доступ вручну.
      </p>
    </div>
  );
}

function Card() {
  const token = useSearchParams().get('t');
  const [data, setData] = useState<InviteResponse | null>(null);
  const [missing, setMissing] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!token) {
      setMissing(true);
      return;
    }

    let stop = false;
    const startedAt = Date.now();

    async function poll() {
      if (stop) return;
      try {
        const res = await fetch(`/api/get-invite?t=${encodeURIComponent(token!)}`);
        if (res.status === 404) {
          setMissing(true);
          return;
        }
        const body = (await res.json()) as InviteResponse;
        if (stop) return;
        setData(body);

        // Далі чекати нема сенсу: або інвайт уже є, або платіж не пройшов.
        if (body.inviteLink || body.status === 'declined' || body.status === 'refunded') return;
      } catch {
        // Мережа могла моргнути — не здаємось, наступна спроба за таймером.
      }

      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setTimedOut(true);
        return;
      }
      setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();
    return () => {
      stop = true;
    };
  }, [token]);

  if (missing) return <OrderNotFound />;

  if (data?.inviteLink) {
    return <InviteCard data={data} />;
  }

  if (data?.status === 'declined' || data?.status === 'refunded') {
    return (
      <div className={CARD}>
        <h1 className="relative m-0 mb-3 font-display text-[24px] font-black leading-[1.2] text-white">
          Оплата не пройшла
        </h1>
        <p className="relative m-0 text-[15px] leading-[1.5] text-white/90">
          Кошти не списані. Спробуйте оформити ще раз — або напишіть нам, якщо гроші все ж зникли
          з картки.
        </p>
      </div>
    );
  }

  return <Waiting timedOut={timedOut} />;
}

function Waiting({ timedOut }: { timedOut: boolean }) {
  return (
    <div className={CARD}>
      <div className="absolute -left-[50px] -top-[50px] h-[180px] w-[180px] rounded-full bg-lime/30 blur-[50px]" />
      <h1 className="relative m-0 mb-3 font-display text-[24px] font-black leading-[1.2] text-white">
        {timedOut ? 'Оплата ще обробляється' : 'Перевіряємо оплату…'}
      </h1>
      <p className="relative m-0 text-[15px] leading-[1.5] text-white/90">
        {timedOut
          ? 'Щойно банк підтвердить платіж, посилання на канал прийде на вашу пошту. Зазвичай це кілька хвилин.'
          : 'Це займе кілька секунд. Не закривайте сторінку.'}
      </p>
    </div>
  );
}

function InviteCard({ data }: { data: InviteResponse }) {
  const link = data.inviteLink!;
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      return; // Буфер недоступний (не-https або старий браузер) — посилання все одно видно текстом.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [link]);

  return (
    <div className={CARD}>
      <div className="absolute -left-[50px] -top-[50px] h-[180px] w-[180px] rounded-full bg-lime/30 blur-[50px]" />
      <h1 className="relative m-0 mb-3 font-display text-[26px] font-black leading-[1.2] text-white">
        Оплата пройшла! 🎉
      </h1>
      <p className="relative m-0 mb-6 text-[15px] leading-[1.5] text-white/90">
        Ось ваше персональне посилання на канал. Воно одноразове — працює тільки для вас.
      </p>

      <a
        href={link}
        className="relative inline-block rounded-pill bg-lime px-8 py-[18px] font-display text-[15px] font-bold text-ink shadow-[0_10px_26px_rgba(27,7,36,.35)]"
      >
        Приєднатися до каналу →
      </a>

      {/* Головна страховка: якщо застосунок не відкрився і t.me недоступний, */}
      {/* посилання можна скопіювати й вставити в Telegram вручну. */}
      <div className="relative mt-7 rounded-2xl bg-black/20 p-4">
        <p className="m-0 mb-2 text-[12.5px] leading-[1.4] text-white/75">
          Не відкрилось? Скопіюйте посилання та вставте його в застосунок Telegram:
        </p>
        <p className="m-0 mb-3 break-all font-mono text-[12.5px] leading-[1.4] text-white">{link}</p>
        <button
          type="button"
          onClick={copy}
          className="rounded-pill bg-white/15 px-5 py-2.5 font-display text-[13px] font-bold text-white"
        >
          {copied ? 'Скопійовано ✓' : 'Скопіювати посилання'}
        </button>
        {data.inviteAppLink && (
          <a
            href={data.inviteAppLink}
            className="mt-2 block text-[12.5px] font-bold text-lime underline"
          >
            Відкрити в застосунку
          </a>
        )}
      </div>

      <p className="relative m-0 mt-4 text-[12px] leading-[1.4] text-white/70">
        Посилання також продубльовано на вашу пошту.
      </p>
    </div>
  );
}

export default function ThankYouCard() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(1200px_600px_at_50%_-100px,#4A0E5C_0%,#1B0724_60%)] p-5">
      {/* useSearchParams вимагає Suspense при статичному рендері */}
      <Suspense fallback={null}>
        <Card />
      </Suspense>
    </div>
  );
}
