'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase-browser';
import LoginForm from './LoginForm';
import StartDateEditor from './StartDateEditor';
import ResultsEditor from './ResultsEditor';
import PublishBar from './PublishBar';

/**
 * Оболонка кабінету: вхід, потім два редактори й кнопка публікації.
 *
 * Ключова ідея всієї адмінки — правки НЕ потрапляють на сайт одразу.
 * Вони лягають у базу, а живий сайт збереться з ними лише після кнопки
 * «Опублікувати». Тому будь-яку помилку видно й можна виправити до того,
 * як її побачить хоч одна покупчиня. Це і є відповідь на «щоб вона нічого
 * не зламала»: зламати нема чого, поки не опубліковано.
 */

export type Content = {
  start_date: string;
  updated_at: string;
  published_at: string | null;
};

export default function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);

  const [content, setContent] = useState<Content | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Правка, яка ще не долетіла до бази. Поки вона є — публікувати рано.
  const [pendingEdit, setPendingEdit] = useState(false);

  useEffect(() => {
    let sb;
    try {
      sb = supabase();
    } catch (err) {
      setFatal(err instanceof Error ? err.message : String(err));
      setReady(true);
      return;
    }

    sb.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);

  const reloadContent = useCallback(async () => {
    const { data, error } = await supabase()
      .from('site_content')
      .select('start_date, updated_at, published_at')
      .eq('id', 1)
      .maybeSingle();

    if (error) {
      setLoadError(error.message);
      return;
    }
    if (!data) {
      // Рядок один і створюється міграцією. Якщо його немає — міграцію
      // не накотили, і говорити про це треба прямо, а не мовчки показувати
      // порожню форму.
      setLoadError('У базі немає рядка site_content — схоже, міграцію 002 не виконано.');
      return;
    }
    setLoadError(null);
    setContent(data as Content);
  }, []);

  useEffect(() => {
    if (session) void reloadContent();
  }, [session, reloadContent]);

  if (!ready) return <Shell>Завантаження…</Shell>;

  if (fatal) {
    return (
      <Shell>
        <p className="text-[15px] leading-[1.5] text-red-700">{fatal}</p>
      </Shell>
    );
  }

  if (!session) return <LoginForm />;

  return (
    // Запас знизу має перекривати панель публікації, яка стоїть fixed.
    // На телефоні вона вища, ніж на десктопі (текст і кнопка лягають у
    // два рядки), тому 112px не вистачало і низ форми ховався під нею.
    <div className="min-h-screen bg-[#f6f2f8] pb-40 md:pb-28">
      <header className="border-b border-black/10 bg-white">
        {/* flex-wrap обов'язковий: на вузькому екрані заголовок, пошта й
            дві кнопки в один рядок не влазять і тягнуть за собою
            горизонтальну прокрутку всієї сторінки. */}
        <div className="mx-auto flex max-w-[760px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-5 py-4">
          <div>
            <h1 className="m-0 font-display text-[18px] font-black text-ink">Кабінет</h1>
            <p className="m-0 text-[12.5px] text-muted">{session.user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* У нову вкладку навмисно: після «Опублікувати» хочеться
                глянути на сайт, і кабінет при цьому має лишитись
                відкритим, разом із незбереженим наміром щось ще
                поправити. */}
            <a
              href="/"
              target="_blank"
              rel="noopener"
              className="rounded-pill border border-black/15 px-4 py-2 text-[13px] font-semibold text-ink"
            >
              Дивитись сайт
            </a>
            <button
              type="button"
              onClick={() => supabase().auth.signOut()}
              className="rounded-pill border border-black/15 px-4 py-2 text-[13px] font-semibold text-ink"
            >
              Вийти
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[760px] flex-col gap-5 px-5 py-6">
        {loadError && (
          <p className="m-0 rounded-2xl bg-red-50 p-4 text-[14px] leading-[1.5] text-red-700">
            {loadError}
          </p>
        )}

        {/* Порядок дій пояснюємо один раз і прямо. Що правки не йдуть на
            сайт одразу — головна незвичність цього кабінету: вона ж і
            захищає від помилок, і вона ж збиває з пантелику, поки про
            неї не сказали вголос. */}
        <p className="m-0 rounded-2xl bg-white/70 px-4 py-3 text-[13px] leading-[1.55] text-muted">
          Зміни зберігаються самі, але на сайті з’являються не одразу.
          Спочатку все виправте, а потім натисніть{' '}
          <strong className="text-ink">«Опублікувати»</strong> внизу — сайт оновиться за
          кілька хвилин. Доки не опублікуєте, відвідувачі бачать старе.
        </p>

        <StartDateEditor
          content={content}
          onSaved={reloadContent}
          onPendingChange={setPendingEdit}
        />
        <ResultsEditor onChanged={reloadContent} />
      </main>

      <PublishBar content={content} pendingEdit={pendingEdit} onPublished={reloadContent} />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f2f8] p-5">
      <div className="w-full max-w-[420px] rounded-24 bg-white p-6 text-center text-[15px] text-muted shadow-card">
        {children}
      </div>
    </div>
  );
}
