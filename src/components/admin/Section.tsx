'use client';

import { useState } from 'react';

/**
 * Блок кабінету, який можна згорнути.
 *
 * Навіщо: розгорнутих блоків набирається на кілька екранів телефона, а
 * за раз Марина міняє щось одне. Згорнуте — це ще й підказка, що тут
 * узагалі є: список розділів видно цілком, без прокрутки.
 *
 * Вміст РОЗМОНТОВУЄТЬСЯ, коли блок закритий, а не ховається стилями.
 * Отже, поки блок не відкрили, він не ходить у базу й не просить
 * підписані посилання на фото. Це помітно на телефоні: кабінет
 * відкривається одразу, а не після кількох запитів.
 */

export default function Section({
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  title: string;
  hint: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-24 bg-white p-5 shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="min-w-0">
          <span className="block font-display text-[16px] font-black text-ink">{title}</span>
          <span className="block text-[13px] leading-[1.5] text-muted">{hint}</span>
        </span>
        <span className="shrink-0 text-[13px] font-semibold text-magenta">
          {open ? 'Згорнути' : 'Відкрити'}
        </span>
      </button>

      {open && <div className="mt-4">{children}</div>}
    </section>
  );
}
