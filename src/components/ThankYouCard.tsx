'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { isValidPlan, telegramUrlForPlan } from '@/lib/site';

/**
 * Сторінка після оплати. WayForPay approvedUrl для кожної кнопки:
 *   Стандарт:              https://marinek.store/thank-you?plan=standard
 *   Чат з учасницями:      https://marinek.store/thank-you?plan=chat
 *   Персональний супровід: https://marinek.store/thank-you?plan=personal
 * За планом обирається Telegram-канал; авторедірект через 3.5 с + кнопка-fallback.
 */
function NotFound() {
  return (
    <div className="relative w-full max-w-[440px] overflow-hidden rounded-28 bg-[linear-gradient(160deg,#C915A0_0%,#E93CB0_50%,#8A2BE2_100%)] px-[26px] py-10 text-center">
      <h1 className="relative m-0 mb-3 font-display text-[54px] font-black leading-none text-white">
        404
      </h1>
      <p className="relative m-0 text-[15px] leading-[1.5] text-white/90">
        Сторінку не знайдено
      </p>
    </div>
  );
}

function Card() {
  const params = useSearchParams();
  const plan = params.get('plan');
  const validPlan = isValidPlan(plan);
  const tgUrl = useMemo(() => telegramUrlForPlan(plan), [plan]);

  useEffect(() => {
    if (!validPlan || !tgUrl) return;
    const t = setTimeout(() => {
      window.location.href = tgUrl;
    }, 3500);
    return () => clearTimeout(t);
  }, [validPlan, tgUrl]);

  // Без ?plan= або з невідомим планом — сторінка не існує.
  if (!validPlan) return <NotFound />;

  return (
    <div className="relative w-full max-w-[440px] overflow-hidden rounded-28 bg-[linear-gradient(160deg,#C915A0_0%,#E93CB0_50%,#8A2BE2_100%)] px-[26px] py-10 text-center">
      <div className="absolute -left-[50px] -top-[50px] h-[180px] w-[180px] rounded-full bg-lime/30 blur-[50px]" />
      <h1 className="relative m-0 mb-3 font-display text-[26px] font-black leading-[1.2] text-white">
        Оплата пройшла! 🎉
      </h1>
      <p className="relative m-0 mb-7 text-[15px] leading-[1.5] text-white/90">
        Тисни кнопку — і переходь у Telegram, там усі матеріали та чат
      </p>
      <a
        href={tgUrl || '#'}
        className="relative inline-block rounded-pill bg-lime px-8 py-[18px] font-display text-[15px] font-bold text-ink shadow-[0_10px_26px_rgba(27,7,36,.35)]"
      >
        Перейти в Telegram →
      </a>
      {tgUrl && (
        <p className="relative m-0 mt-4 text-[12.5px] text-white/75">
          Зараз перенаправимо автоматично…
        </p>
      )}
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
