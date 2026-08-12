'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

/**
 * Вхід у кабінет. Тільки пошта й пароль — реєстрації немає взагалі.
 *
 * Акаунт заводиться вручну через Supabase Admin API (див. README до
 * адмінки), а в налаштуваннях проєкту вимкнено «Allow new users to sign
 * up». Тобто список тих, хто може зайти, закритий і складається з однієї
 * людини. Форма «Зареєструватися» тут відсутня не для краси: доки її
 * немає й реєстрація вимкнена, стороннього акаунта просто нізвідки взяти.
 *
 * Текст помилки навмисно однаковий для «нема такої пошти» і «невірний
 * пароль» — Supabase так і відповідає, і це правильно: інакше форму
 * можна було б використати, щоб перевіряти чужі адреси.
 */

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    const { error } = await supabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) setError('Не вдалося увійти. Перевірте пошту й пароль.');
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f2f8] p-5">
      <form
        onSubmit={submit}
        className="w-full max-w-[380px] rounded-24 bg-white p-6 shadow-card"
      >
        <h1 className="m-0 mb-1 font-display text-[20px] font-black text-ink">Кабінет</h1>
        <p className="m-0 mb-5 text-[13.5px] leading-[1.5] text-muted">
          Дата старту й фото учасниць.
        </p>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink">Пошта</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-black/15 px-4 py-3 text-[15px] text-ink outline-none focus:border-magenta"
          />
        </label>

        <label className="mb-5 block">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink">Пароль</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-black/15 px-4 py-3 text-[15px] text-ink outline-none focus:border-magenta"
          />
        </label>

        {error && (
          <p className="m-0 mb-4 text-[13.5px] leading-[1.4] text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-pill bg-magenta px-6 py-3.5 font-display text-[15px] font-bold text-white disabled:opacity-60"
        >
          {busy ? 'Входимо…' : 'Увійти'}
        </button>
      </form>
    </div>
  );
}
