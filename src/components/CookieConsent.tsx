'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { GA_ID, SHOW_COOKIE_BANNER } from '@/lib/site';

const STORAGE_KEY = 'mx-cookie-consent';
type Choice = 'all' | 'necessary' | null;

/**
 * Cookie-банер + Google Analytics.
 *
 * Логіка узгоджена з README: сам сайт не збирає персональних даних, тому банер
 * вимкнений за замовчуванням. Але щойно підключається аналітика (NEXT_PUBLIC_GA_ID),
 * банер вмикається автоматично, а скрипти GA монтуються ЛИШЕ після згоди «Прийняти всі».
 * Вибір зберігається в localStorage['mx-cookie-consent']: 'all' | 'necessary'.
 */
export default function CookieConsent() {
  const [choice, setChoice] = useState<Choice>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setChoice((localStorage.getItem(STORAGE_KEY) as Choice) || null);
    } catch {
      /* localStorage недоступний — банер просто показується щоразу */
    }
    setReady(true);
  }, []);

  const setConsent = (value: Exclude<Choice, null>) => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    setChoice(value);
  };

  const showBanner = SHOW_COOKIE_BANNER && ready && choice === null;
  const analyticsAllowed = Boolean(GA_ID) && choice === 'all';

  return (
    <>
      {analyticsAllowed && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', { anonymize_ip: true });
            `}
          </Script>
        </>
      )}

      {showBanner && (
        <div className="fixed bottom-[84px] left-1/2 z-[99] flex w-[calc(100%-24px)] max-w-[440px] -translate-x-1/2 flex-col gap-3 rounded-20 border border-magenta/40 bg-ink p-[16px_18px] shadow-[0_14px_44px_rgba(27,7,36,.55)]">
          <div className="text-[13px] leading-[1.5] text-white/[.88]">
            Ми використовуємо cookies для коректної роботи сайту та анонімної статистики. Деталі — у{' '}
            <a href="/privacy" className="text-lime hover:text-lime">
              Політиці конфіденційності
            </a>
            .
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={() => setConsent('all')}
              className="flex-1 cursor-pointer rounded-pill border-none bg-lime p-3 text-[13px] font-extrabold text-ink"
            >
              Прийняти всі
            </button>
            <button
              onClick={() => setConsent('necessary')}
              className="flex-1 cursor-pointer rounded-pill border-[1.5px] border-white/40 bg-transparent p-3 text-[13px] font-semibold text-white"
            >
              Лише необхідні
            </button>
          </div>
        </div>
      )}
    </>
  );
}
