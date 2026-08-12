'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
 *
 * ЗБЕРІГАЄТЬСЯ САМО, без кнопки. Спершу кнопка була — і це виявилось
 * пасткою на живому запуску 12.08.2026: усе інше в кабінеті (додати
 * картку, видалити, переставити) лягає в базу одразу, тому природне
 * «змінив дату — тисну Опублікувати» мовчки публікувало стару дату.
 * Помилку помітно не одразу: збірка проходить успішно, просто нічого
 * не змінюється. Одна кнопка «Опублікувати» на весь кабінет — менше
 * місць, де можна не туди натиснути.
 */

// Пауза перед записом. Дату можна не тільки клікнути в календарі, а й
// набрати з клавіатури — і тоді рік «2027» проходить через 0002, 0020,
// 0202. Кожне з них — валідна дата, тобто без паузи це чотири записи
// в базу підряд замість одного.
const SAVE_DELAY_MS = 800;

export default function StartDateEditor({
  content,
  onSaved,
  onPendingChange,
}: {
  content: Content | null;
  onSaved: () => Promise<void>;
  /**
   * Повідомляє нагору, що правка ще не долетіла до бази. Поки це так,
   * кнопка «Опублікувати» вимкнена: інакше клік у першу секунду після
   * вибору дати запустив би збірку зі старою датою, а нова записалась
   * би вже після неї. Збірка при цьому пройшла б успішно — і зрозуміти,
   * чому дата не змінилась, було б неможливо.
   */
  onPendingChange: (pending: boolean) => void;
}) {
  const [value, setValue] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (content) setValue(toInputDate(content.start_date));
  }, [content]);

  const save = useCallback(
    async (nextDate: string) => {
      setState('saving');
      setError(null);

      const { error } = await supabase()
        .from('site_content')
        .update({ start_date: nextDate })
        .eq('id', 1);

      if (error) {
        setError(error.message);
        setState('idle');
        onPendingChange(false);
        return;
      }
      await onSaved();
      setState('saved');
      onPendingChange(false);
    },
    [onSaved, onPendingChange],
  );

  // Таймер, що не встиг спрацювати, не має писати в базу після того,
  // як компонент зник з екрана.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  if (!content) {
    return <Card><p className="m-0 text-[14px] text-muted">Завантаження…</p></Card>;
  }

  const nextDate = fromInputDate(value);
  const inPast = Boolean(value) && value < todayIso();

  function onPick(iso: string) {
    setValue(iso);
    setState('idle');
    if (timer.current) clearTimeout(timer.current);

    const picked = fromInputDate(iso);
    if (!picked || picked === content!.start_date) {
      onPendingChange(false);
      return;
    }
    onPendingChange(true);
    timer.current = setTimeout(() => void save(picked), SAVE_DELAY_MS);
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
          onChange={(e) => onPick(e.target.value)}
          className="rounded-2xl border border-black/15 px-4 py-3 text-[15px] text-ink outline-none focus:border-magenta"
        />
        <span className="text-[14px] text-muted">
          На сайті: <strong className="text-ink">{nextDate || content.start_date}</strong>
        </span>
        {state === 'saving' && <span className="text-[13px] text-muted">Зберігаємо…</span>}
        {state === 'saved' && <span className="text-[13px] font-semibold text-green-700">Збережено ✓</span>}
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
