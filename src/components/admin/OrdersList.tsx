'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

/**
 * Останні замовлення.
 *
 * Це НЕ бухгалтерія і не заміна кабінету WayForPay: гроші, чеки й
 * повернення живуть там. Тут закритий один сценарій, якого WayForPay не
 * покриває: він показує, що оплата пройшла, але нічого не знає про те,
 * чи дійшов доступ у Telegram і чи пішов лист. Саме про це жінки й
 * пишуть — «заплатила, а нічого не прийшло».
 *
 * Тому колонки тут не про гроші, а про видачу доступу. Самого посилання
 * в списку немає й не буде — воно не доїжджає навіть до цієї сторінки
 * (див. netlify/functions/list-orders.ts).
 */

type Order = {
  ref: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  email: string | null;
  date: string;
  inviteIssued: boolean;
  emailSent: boolean;
};

// Скільки показуємо одразу. Потрібні майже завжди останні: питання, з
// яким сюди заходять, звучить як «жінка щойно заплатила, чи дійшов до
// неї доступ». Решта — за кнопкою.
const PREVIEW = 3;

const PLAN_LABEL: Record<string, string> = {
  standard: 'Стандарт',
  chat: 'Чат',
  personal: 'Персональний',
};

const STATUS: Record<string, { label: string; cls: string }> = {
  paid: { label: 'Оплачено', cls: 'bg-green-100 text-green-800' },
  pending: { label: 'Не завершено', cls: 'bg-black/10 text-ink/70' },
  declined: { label: 'Відхилено', cls: 'bg-red-100 text-red-800' },
  refunded: { label: 'Повернено', cls: 'bg-amber-100 text-amber-800' },
};

export default function OrdersList() {
  return (
    <section className="rounded-24 bg-white p-5 shadow-card">
      <h2 className="m-0 mb-1 font-display text-[16px] font-black text-ink">
        Останні замовлення
      </h2>
      <p className="m-0 mb-4 text-[13px] leading-[1.5] text-muted">
        Хто оплатив і чи дійшов до неї доступ.
      </p>
      <Orders />
    </section>
  );
}

function Orders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const {
      data: { session },
    } = await supabase().auth.getSession();

    const res = await fetch('/api/list-orders', {
      headers: { authorization: `Bearer ${session?.access_token ?? ''}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? 'Не вдалося завантажити замовлення.');
      setOrders([]);
      return;
    }
    setOrders((await res.json()).orders as Order[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <p className="m-0 rounded-2xl bg-red-50 p-3.5 text-[13.5px] leading-[1.5] text-red-700">
        {error}
      </p>
    );
  }
  if (orders === null) return <p className="m-0 text-[14px] text-muted">Завантаження…</p>;
  if (orders.length === 0)
    return <p className="m-0 text-[14px] text-muted">Замовлень поки немає.</p>;

  const visible = showAll ? orders : orders.slice(0, PREVIEW);

  return (
    <>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {visible.map((o) => (
          <li key={o.ref} className="rounded-2xl border border-black/10 p-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className={`rounded-pill px-2.5 py-1 text-[11.5px] font-bold ${
                  STATUS[o.status]?.cls ?? 'bg-black/10 text-ink/70'
                }`}
              >
                {STATUS[o.status]?.label ?? o.status}
              </span>
              <span className="text-[13.5px] font-bold text-ink">
                {PLAN_LABEL[o.plan] ?? o.plan}
              </span>
              <span className="text-[13px] text-muted">
                {o.amount} {o.currency}
              </span>
              <span className="ml-auto text-[12.5px] text-muted">{fmtDate(o.date)}</span>
            </div>

            <p className="m-0 mt-1.5 break-all text-[13px] text-textBody">
              {o.email ?? 'пошта невідома'}
            </p>

            {/* Показуємо тільки там, де є що видавати: у відхилених
                доступу й не мало бути, і червоні позначки там лише
                лякали б. */}
            {o.status === 'paid' && (
              <p className="m-0 mt-1 text-[12.5px] text-muted">
                {o.inviteIssued ? '✓ доступ створено' : '✕ доступ не створено'}
                {' · '}
                {o.emailSent ? '✓ лист надіслано' : '✕ лист не надіслано'}
              </p>
            )}
          </li>
        ))}
      </ul>

      {orders.length > PREVIEW && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 rounded-pill border border-black/15 px-5 py-2.5 text-[13px] font-semibold text-ink"
        >
          {showAll ? 'Показати менше' : `Показати всі (${orders.length})`}
        </button>
      )}

      <p className="m-0 mt-3 text-[12.5px] leading-[1.5] text-muted">
        Гроші, чеки й повернення — у кабінеті WayForPay. Тут видно те, чого там немає: чи дійшов
        доступ у Telegram. Якщо навпроти оплати стоїть ✕ — напишіть мені, відкрию вручну.
        <br />
        Ті, хто відкрив оплату й пішов, нічого не ввівши, у списку не показані: це не невдалі
        платежі, а просто закриті вкладки.
      </p>
    </>
  );
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
}
