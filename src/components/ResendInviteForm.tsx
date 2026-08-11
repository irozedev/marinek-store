'use client';

import { useState } from 'react';

/**
 * «Не отримали листа?» — єдиний спосіб дістати доступ, коли лист загубився.
 *
 * Це не косметика: на живому тесті лист пішов у «Спам» на iCloud, а саме
 * там сидить основна частина покупчинь (16 з 18 оплат — через Apple Pay).
 * Раніше в такому разі лишалось тільки писати Марині й чекати.
 *
 * Форма нічого не показує на екрані — вона лише просить надіслати лист
 * повторно на ту саму адресу, що вже в замовленні. Тому відповідь однакова
 * і для існуючої пошти, і для випадкової: інакше сторінка перетворилась би
 * на спосіб перевіряти, хто саме купував.
 */

type State = 'idle' | 'sending' | 'sent' | 'error';

export default function ResendInviteForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'sending') return;
    setState('sending');
    try {
      const res = await fetch('/api/resend-invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setState(res.ok ? 'sent' : 'error');
    } catch {
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <p className="m-0 mt-3 text-[13.5px] leading-[1.5] text-lime">
        Якщо на цю пошту є оплачене замовлення — лист уже в дорозі. Перевірте також «Спам».
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Пошта, якою оплачували"
        autoComplete="email"
        inputMode="email"
        className="w-full rounded-pill bg-white/95 px-4 py-3 text-[15px] text-ink outline-none placeholder:text-ink/45"
      />
      <button
        type="submit"
        disabled={state === 'sending'}
        className="w-full rounded-pill bg-white/15 px-5 py-3 font-display text-[14px] font-bold text-white disabled:opacity-60"
      >
        {state === 'sending' ? 'Надсилаємо…' : 'Надіслати лист ще раз'}
      </button>
      {state === 'error' && (
        <p className="m-0 text-[13px] leading-[1.4] text-white/80">
          Не вдалося надіслати. Спробуйте ще раз або напишіть нам.
        </p>
      )}
    </form>
  );
}
