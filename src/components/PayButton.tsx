'use client';

import { useState } from 'react';

/**
 * Кнопка тарифу. Замість прямого посилання на «платіжну кнопку» WayForPay
 * питає в /api/create-payment підписані поля й сабмітить їх формою.
 *
 * Так замовлення створюється НА НАШОМУ боці зі своїм orderReference —
 * без цього неможливо зіставити платіж із конкретною людиною й видати
 * їй персональний інвайт.
 */

type Props = {
  plan: 'standard' | 'chat' | 'personal';
  className: string;
  children: React.ReactNode;
};

export default function PayButton({ plan, className, children }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  async function startPayment() {
    setState('loading');
    try {
      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error(`create-payment: ${res.status}`);

      const { action, fields } = (await res.json()) as {
        action: string;
        fields: Record<string, string | string[]>;
      };
      redirectToWayForPay(action, fields);
      // Стан навмисно лишається 'loading': сторінка вже йде на WayForPay.
    } catch {
      setState('error');
    }
  }

  return (
    <>
      <button type="button" onClick={startPayment} disabled={state === 'loading'} className={className}>
        {state === 'loading' ? 'Зачекайте…' : children}
      </button>
      {state === 'error' && (
        <p className="m-0 mt-2 text-center text-[12.5px] leading-[1.4] text-magenta">
          Не вдалося перейти до оплати. Спробуйте ще раз або напишіть нам.
        </p>
      )}
    </>
  );
}

/** WayForPay приймає тільки POST-форму; масиви — з суфіксом [] у назві поля. */
function redirectToWayForPay(action: string, fields: Record<string, string | string[]>) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  form.acceptCharset = 'utf-8';

  for (const [name, value] of Object.entries(fields)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = Array.isArray(value) ? `${name}[]` : name;
      input.value = item;
      form.appendChild(input);
    }
  }

  document.body.appendChild(form);
  form.submit();
}
