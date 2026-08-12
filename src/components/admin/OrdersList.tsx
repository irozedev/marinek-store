'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

/**
 * Останні замовлення.
 *
 * Це НЕ бухгалтерія і не заміна кабінету WayForPay: гроші, чеки й
 * повернення живуть там. Тут закритий один конкретний сценарій, якого
 * WayForPay не покриває: він показує, що оплата пройшла, але нічого не
 * знає про те, чи дійшов доступ у Telegram і чи пішов лист. Саме про це
 * жінки й пишуть — «заплатила, а нічого не прийшло».
 *
 * Тому колонки тут не про гроші, а про видачу доступу: чи створене
 * посилання і чи відправлений лист. Самого посилання в списку немає й
 * не буде — воно не доїжджає навіть до цієї сторінки (див. list-orders).
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
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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
    const body = await res.json();
    setOrders(body.orders as Order[]);
  }, []);

  useEffect(() => {
    if (open && orders === null) void load();
  }, [open, orders, load]);

  return (
    <section className="rounded-24 bg-white p-5 shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span>
          <span className="block font-display text-[16px] font-black text-ink">
            Останні замовлення
          </span>
          <span className="block text-[13px] leading-[1.5] text-muted">
            Хто оплатив і чи дійшов до неї доступ.
          </span>
        </span>
        <span className="shrink-0 text-[13px] font-semibold text-magenta">
          {open ? 'Сховати' : 'Показати'}
        </span>
      </button>

      {open && (
        <div className="mt-4">
          {error && (
            <p className="m-0 mb-3 rounded-2xl bg-red-50 p-3.5 text-[13.5px] leading-[1.5] text-red-700">
              {error}
            </p>
          )}

          {orders === null ? (
            <p className="m-0 text-[14px] text-muted">Завантаження…</p>
          ) : orders.length === 0 ? (
            <p className="m-0 text-[14px] text-muted">Замовлень поки немає.</p>
          ) : (
            <>
              <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                {orders.map((o) => (
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

                    {/* Показуємо тільки там, де є що видавати: у
                        незавершених і відхилених доступу й не мало бути,
                        і червоні позначки там лише лякали б. */}
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

              <p className="m-0 mt-3 text-[12.5px] leading-[1.5] text-muted">
                Гроші, чеки й повернення — у кабінеті WayForPay. Тут видно те, чого там немає:
                чи дійшов доступ у Telegram. Якщо навпроти оплати стоїть ✕ — напишіть мені,
                відкрию вручну.
                <br />
                Ті, хто відкрив оплату й пішов, нічого не ввівши, у списку не показані: це не
                невдалі платежі, а просто закриті вкладки.
              </p>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' });
}
