'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import type { Content } from './AdminApp';

/**
 * Публікація — окремий свідомий крок, а не автозбереження.
 *
 * Сайт статичний: правки в базі нічого не міняють, поки він не
 * перезібрався. Тут це не обмеження, а зручність — Марина може спокійно
 * поправити дату, додати три картки, передумати, видалити одну, і лише
 * потім показати все це світові однією кнопкою.
 *
 * Перезбірка триває кілька хвилин, тому кнопка чесно про це попереджає:
 * інакше після натискання здається, що нічого не сталося, і хочеться
 * натиснути ще раз.
 */

export default function PublishBar({
  content,
  pendingEdit,
  onPublished,
}: {
  content: Content | null;
  /** Правка ще пишеться в базу — публікувати рано, зібралося б старе. */
  pendingEdit: boolean;
  onPublished: () => Promise<void>;
}) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  if (!content) return null;

  const dirty =
    !content.published_at || Date.parse(content.published_at) < Date.parse(content.updated_at);

  async function publish() {
    setState('sending');
    setError(null);

    const {
      data: { session },
    } = await supabase().auth.getSession();

    const res = await fetch('/api/publish-site', {
      method: 'POST',
      headers: { authorization: `Bearer ${session?.access_token ?? ''}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? 'Не вдалося запустити оновлення. Спробуйте за хвилину.');
      setState('idle');
      return;
    }

    setState('sent');
    await onPublished();
  }

  return (
    // paddingBottom з safe-area: унизу екрана айфона живе смуга жестів,
    // і без цього кнопка притискається впритул до неї.
    <div
      className="fixed inset-x-0 bottom-0 border-t border-black/10 bg-white/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Один рядок, не два. Панель висить поверх контенту, тож кожен її
          зайвий піксель — це піксель, яким вона накриває картки знизу.
          На телефоні вона з'їдала стільки, що наступна картка ховалась
          під нею наполовину. */}
      <div className="mx-auto flex max-w-[760px] items-center justify-between gap-3 px-4 py-3 md:px-5 md:py-4">
        <p className="m-0 min-w-0 flex-1 text-[12.5px] leading-[1.4] text-muted md:max-w-[420px] md:text-[13px] md:leading-[1.45]">
          {pendingEdit ? (
            <span className="font-semibold text-ink">Зберігаємо зміни…</span>
          ) : state === 'sent' ? (
            <span className="font-semibold text-ink">
              Запустили. Сайт оновиться за 3–5 хвилин.
            </span>
          ) : dirty ? (
            // Без хвоста «Натисніть „Опублікувати“…»: він переказує напис
            // на кнопці, яка стоїть поруч, а на телефоні через нього
            // панель розросталась на третину екрана.
            <span className="font-semibold text-ink">Є зміни, яких ще немає на сайті.</span>
          ) : (
            'Сайт показує останні зміни.'
          )}
          {error && <span className="mt-1 block text-red-700">{error}</span>}
        </p>

        <button
          type="button"
          onClick={publish}
          disabled={pendingEdit || state === 'sending' || (!dirty && state === 'idle')}
          className="shrink-0 rounded-pill bg-magenta px-5 py-3 font-display text-[14px] font-bold text-white disabled:opacity-40 md:px-7 md:py-3.5 md:text-[15px]"
        >
          {state === 'sending' ? 'Запускаємо…' : 'Опублікувати'}
        </button>
      </div>
    </div>
  );
}
