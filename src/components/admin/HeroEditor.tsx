'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase, RESULTS_BUCKET } from '@/lib/supabase-browser';
import { compressToWebp, HERO } from '@/lib/compress-image';
import Section from './Section';

/**
 * Головне фото першого екрана.
 *
 * Підказки про розмір тут не формальність. Це фото стоїть у першому
 * екрані й обрізається по-різному на телефоні та на комп'ютері, а зверху
 * на нього накладена прозора маска. Тому горизонтальний знімок або
 * обличчя з краю кадру виглядають зламано, і побачити це можна лише
 * після публікації. Дешевше сказати заздалегідь.
 *
 * ДЕ ВОНО ЗБЕРІГАЄТЬСЯ. Не в колонці таблиці, а прямо у сховищі, під
 * іменем «hero-<id>.webp». Колонка вимагала б окремої міграції заради
 * одного рядка, а міграції тут накочуються руками в SQL Editor — тобто
 * з'являється крок, який легко зробити наполовину або забути зовсім.
 * Ім'я з префіксом дає те саме: збірка бере найсвіжіший файл «hero-*»,
 * а якщо жодного немає — той банер, що лежить у репозиторії.
 *
 * Ім'я щоразу нове, а не «hero.webp», з двох причин. По-перше, кеш: файл
 * зі сталим іменем браузери й CDN продовжували б віддавати старим ще
 * довго після заміни. По-друге, заміна не залишає проміжку, коли банера
 * немає взагалі: старий видаляється тільки після того, як новий уже ліг.
 */

const HERO_PREFIX = 'hero-';
const FALLBACK = '/images/hero-trainer.webp';

export default function HeroEditor({ onSaved }: { onSaved: () => Promise<void> }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async () => {
    const current = await newestHero();
    if (!current) {
      // Свого фото ще немає: показуємо те, що зараз на сайті.
      setPreview(FALLBACK);
      return;
    }
    const { data } = await supabase()
      .storage.from(RESULTS_BUCKET)
      .createSignedUrl(current, 3600);
    setPreview(data?.signedUrl ?? FALLBACK);
  }, []);

  useEffect(() => {
    void loadPreview();
  }, [loadPreview]);

  async function pick(file: File | null) {
    if (!file || busy) return;
    setBusy(true);
    setError(null);

    const sb = supabase();
    const previous = await newestHero();

    try {
      const blob = await compressToWebp(file, HERO);
      const path = `${HERO_PREFIX}${crypto.randomUUID()}.webp`;

      const up = await sb.storage
        .from(RESULTS_BUCKET)
        .upload(path, blob, { contentType: 'image/webp' });
      if (up.error) throw new Error(up.error.message);

      // Позначаємо, що є неопубліковані зміни. Завантаження у сховище
      // саме по собі таблиці не чіпає, тож без цього рядка кабінет
      // казав би «сайт показує останні зміни», хоч фото вже інше.
      await sb.from('site_content').update({ updated_at: new Date().toISOString() }).eq('id', 1);

      if (previous) await sb.storage.from(RESULTS_BUCKET).remove([previous]);

      await loadPreview();
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Головне фото" hint="Те, що видно найпершим, коли відкривають сайт.">
      <div className="flex flex-wrap items-start gap-4">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- підписане
          // посилання на приватний bucket, next/image з ним не працює.
          <img
            src={preview}
            alt="Головне фото зараз"
            className="h-[168px] w-[112px] shrink-0 rounded-2xl object-cover"
          />
        ) : (
          <span className="block h-[168px] w-[112px] shrink-0 rounded-2xl bg-black/10" />
        )}

        <div className="min-w-[180px] flex-1">
          <p className="m-0 mb-2 text-[13px] font-bold text-ink">Яке фото підійде</p>
          <ul className="m-0 mb-3 list-none space-y-1.5 p-0 text-[12.5px] leading-[1.45] text-muted">
            <li>
              <strong className="text-ink">Вертикальне</strong>, як звичайне фото з телефона.
              Горизонтальне обріжеться.
            </li>
            <li>
              Бажано від <strong className="text-ink">1024×1536</strong> точок. Менше можна,
              але буде помітно нечітким.
            </li>
            <li>
              Обличчя тримайте <strong className="text-ink">вгорі по центру</strong>: краї
              підрізаються по-різному на телефоні й комп’ютері.
            </li>
            <li>
              Низ і лівий край <strong className="text-ink">розчиняються</strong> у фоні, а внизу
              зліва лежить напис «Для жінок». Нічого важливого туди не ставте.
            </li>
          </ul>

          <input
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
            className="w-full text-[13px] text-muted file:mr-3 file:rounded-pill file:border-0 file:bg-ink file:px-4 file:py-2 file:text-[13px] file:font-bold file:text-white"
          />

          {busy && <p className="m-0 mt-2 text-[13px] text-muted">Завантажуємо…</p>}
          {error && <p className="m-0 mt-2 text-[13px] leading-[1.4] text-red-700">{error}</p>}
        </div>
      </div>
    </Section>
  );
}

/**
 * Найсвіжіший файл «hero-*» у сховищі. Фільтруємо на своєму боці, а не
 * параметром prefix: bucket плаский і в ньому десяток файлів, тож
 * покладатися на те, як саме Supabase трактує prefix у пласкому
 * сховищі, немає потреби.
 */
async function newestHero(): Promise<string | null> {
  const { data } = await supabase()
    .storage.from(RESULTS_BUCKET)
    .list('', { limit: 200, sortBy: { column: 'created_at', order: 'desc' } });

  return data?.find((o) => o.name.startsWith(HERO_PREFIX))?.name ?? null;
}
