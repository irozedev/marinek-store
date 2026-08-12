'use client';

import { useState } from 'react';

/**
 * Блок кабінету, який можна згорнути. Зараз такий один — замовлення.
 *
 * Редактори (дата, фото, результати) навмисно лишились відкритими: це
 * те, заради чого сюди заходять, і зайвий клік перед кожною правкою
 * дратував би. Замовлення ж — довідка на випадок «мені не прийшов
 * доступ», відкривати її щоразу не треба.
 *
 * Вміст РОЗМОНТОВУЄТЬСЯ, коли блок закритий, а не ховається стилями.
 * Отже, поки список не відкрили, запиту за замовленнями не буде взагалі.
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
