'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import type { Content } from './AdminApp';

/**
 * Дата старту потоку.
 *
 * Поле — календар, а не текст, і це не дрібниця. На сайті дата живе у
 * форматі ДД.ММ і стоїть у чотирьох місцях вёрстки плюс у <title>.
 * Текстове поле дозволило б написати «3 серпня» або «03.08.2026» — і всі
 * чотири місця поїхали б одночасно, а помітили б це вже покупчині.
 * З календаря неправильний формат ввести неможливо в принципі.
 */

export default function StartDateEditor({
  content,
  onSaved,
}: {
  content: Content | null;
  onSaved: () => Promise<void>;
}) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (content) setValue(toInputDate(content.start_date));
  }, [content]);

  if (!content) {
    return <Card><p className="m-0 text-[14px] text-muted">Завантаження…</p></Card>;
  }

  const nextDate = fromInputDate(value);
  const changed = Boolean(nextDate) && nextDate !== content.start_date;
  const inPast = Boolean(value) && value < todayIso();

  async function save() {
    if (!nextDate || busy) return;
    setBusy(true);
    setError(null);

    const { error } = await supabase()
      .from('site_content')
      .update({ start_date: nextDate })
      .eq('id', 1);

    if (error) setError(error.message);
    else await onSaved();
    setBusy(false);
  }

  return (
    <Card>
      <h2 className="m-0 mb-1 font-display text-[16px] font-black text-ink">Старт потоку</h2>
      <p className="m-0 mb-4 text-[13px] leading-[1.5] text-muted">
        Дата підтягнеться скрізь: перший екран, тарифи, кнопка внизу й заголовок вкладки.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="date"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-2xl border border-black/15 px-4 py-3 text-[15px] text-ink outline-none focus:border-magenta"
        />
        <span className="text-[14px] text-muted">
          На сайті: <strong className="text-ink">{nextDate || content.start_date}</strong>
        </span>
      </div>

      {inPast && (
        // Не забороняємо: дата в минулому інколи потрібна (потік уже йде).
        // Але мовчки пропустити це теж не можна — найімовірніше це описка
        // в році, а на сайті рік не видно, і помилку ніхто не помітить.
        <p className="m-0 mt-3 text-[13px] leading-[1.4] text-amber-700">
          Ця дата вже минула. Якщо потік попереду — перевірте рік у календарі.
        </p>
      )}

      {error && <p className="m-0 mt-3 text-[13px] text-red-700">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={!changed || busy}
        className="mt-4 rounded-pill bg-ink px-6 py-3 font-display text-[14px] font-bold text-white disabled:opacity-40"
      >
        {busy ? 'Зберігаємо…' : 'Зберегти дату'}
      </button>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-24 bg-white p-5 shadow-card">{children}</section>;
}

/** «03.08» → «2026-08-03» для <input type="date">. Рік — поточний. */
function toInputDate(ddmm: string): string {
  const [day, month] = ddmm.split('.');
  if (!day || !month) return '';
  return `${new Date().getFullYear()}-${month}-${day}`;
}

/** «2026-08-03» → «03.08». Рік свідомо відкидаємо — на сайті його немає. */
function fromInputDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return month && day ? `${day}.${month}` : '';
}

function todayIso(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
