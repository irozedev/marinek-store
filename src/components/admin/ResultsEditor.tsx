'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase, RESULTS_BUCKET } from '@/lib/supabase-browser';
import { compressToWebp } from '@/lib/compress-image';
import Section from './Section';

/**
 * Картки «Результати учасниць»: пара фото до/після, ім'я, вік, тривалість.
 *
 * Фото стискаються в браузері до завантаження (lib/compress-image.ts) —
 * інакше знімок з телефона на 4 МБ поїхав би у перший екран лендингу.
 *
 * Bucket приватний, тому для попереднього перегляду беремо підписані
 * посилання. На живому сайті цих посилань немає взагалі: збірка викачує
 * файли й далі їх роздає Netlify.
 */

type Row = {
  id: string;
  name: string;
  age: string;
  weeks: string;
  before_path: string;
  after_path: string;
  position: number;
};

const LIMITS = { name: 40, age: 24, weeks: 32 };

export default function ResultsEditor({ onChanged }: { onChanged: () => Promise<void> }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = supabase();
    const { data, error } = await sb
      .from('results')
      .select('id, name, age, weeks, before_path, after_path, position')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      setError(error.message);
      return;
    }

    const list = (data ?? []) as Row[];
    setRows(list);
    setError(null);

    const paths = list.flatMap((r) => [r.before_path, r.after_path]);
    if (paths.length === 0) {
      setUrls({});
      return;
    }
    const { data: signed } = await sb.storage
      .from(RESULTS_BUCKET)
      .createSignedUrls(paths, 3600);
    const map: Record<string, string> = {};
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
    }
    setUrls(map);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function refresh() {
    await load();
    await onChanged();
  }

  async function remove(row: Row) {
    if (!rows) return;
    // Порожня секція «Результати учасниць» на лендингу виглядає як
    // поламана сторінка, а не як свідоме рішення. Тому останню картку
    // не даємо видалити — спершу нехай з'явиться нова.
    if (rows.length === 1) {
      setError('Це остання картка. Спершу додайте нову — порожній блок на сайті виглядає як помилка.');
      return;
    }
    if (!confirm(`Видалити картку «${row.name}»? Це не можна скасувати.`)) return;

    setBusyId(row.id);
    const sb = supabase();
    const { error } = await sb.from('results').delete().eq('id', row.id);
    if (error) {
      setError(error.message);
      setBusyId(null);
      return;
    }
    // Файли прибираємо після рядка: якщо це не спрацює, у сховищі просто
    // залишиться зайвий файл — неприємно, але нічого не ламає.
    await sb.storage.from(RESULTS_BUCKET).remove([row.before_path, row.after_path]);
    setBusyId(null);
    await refresh();
  }

  async function move(index: number, delta: number) {
    if (!rows) return;
    const other = rows[index + delta];
    const current = rows[index];
    if (!other || !current) return;

    setBusyId(current.id);
    const sb = supabase();
    // Позиції могли злипнутися (усі нулі), тому пишемо не «обмін значень»,
    // а нову нумерацію обох рядків за їхнім місцем у списку.
    await sb.from('results').update({ position: index + delta }).eq('id', current.id);
    await sb.from('results').update({ position: index }).eq('id', other.id);
    setBusyId(null);
    await refresh();
  }

  return (
    <Section
      title="Результати учасниць"
      hint="Фото стискаються автоматично — можна вантажити прямо з телефона."
    >
      {error && (
        <p className="m-0 mb-4 rounded-2xl bg-red-50 p-3.5 text-[13.5px] leading-[1.5] text-red-700">
          {error}
        </p>
      )}

      {rows === null ? (
        <p className="m-0 text-[14px] text-muted">Завантаження…</p>
      ) : (
        <ul className="m-0 mb-5 flex list-none flex-col gap-3 p-0">
          {rows.map((row, i) => (
            // flex-wrap: два прев'ю плюс три кнопки займають майже всю
            // ширину телефона, і імені лишається кілька пікселів. На
            // вузькому екрані кнопки просто переходять на другий рядок,
            // замість того щоб виштовхувати сторінку вбік.
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/10 p-3"
            >
              <div className="flex shrink-0 gap-1">
                <Thumb src={urls[row.before_path]} alt={`${row.name} — до`} />
                <Thumb src={urls[row.after_path]} alt={`${row.name} — після`} />
              </div>

              {/* min-w-[110px], а не min-w-0: інакше ім'я стискається в
                  нуль і рядок ніколи не переноситься, бо формально все
                  «влізло». */}
              <div className="min-w-[110px] flex-1">
                <p className="m-0 truncate text-[14.5px] font-bold text-ink">{row.name}</p>
                <p className="m-0 truncate text-[12.5px] text-muted">
                  {row.age} · {row.weeks}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <IconButton
                  label="Вище"
                  disabled={i === 0 || busyId !== null}
                  onClick={() => move(i, -1)}
                >
                  ↑
                </IconButton>
                <IconButton
                  label="Нижче"
                  disabled={i === rows.length - 1 || busyId !== null}
                  onClick={() => move(i, 1)}
                >
                  ↓
                </IconButton>
                <IconButton
                  label="Видалити"
                  disabled={busyId !== null}
                  onClick={() => remove(row)}
                >
                  ✕
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddForm onAdded={refresh} nextPosition={rows?.length ?? 0} onError={setError} />
    </Section>
  );
}

function AddForm({
  onAdded,
  nextPosition,
  onError,
}: {
  onAdded: () => Promise<void>;
  nextPosition: number;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weeks, setWeeks] = useState('');
  const [before, setBefore] = useState<File | null>(null);
  const [after, setAfter] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const ready = name.trim() && age.trim() && weeks.trim() && before && after;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);

    const sb = supabase();
    const uploaded: string[] = [];

    try {
      const beforePath = await upload(before!);
      uploaded.push(beforePath);
      const afterPath = await upload(after!);
      uploaded.push(afterPath);

      const { error } = await sb.from('results').insert({
        name: name.trim(),
        age: age.trim(),
        weeks: weeks.trim(),
        before_path: beforePath,
        after_path: afterPath,
        position: nextPosition,
      });
      if (error) throw new Error(error.message);

      setName('');
      setAge('');
      setWeeks('');
      setBefore(null);
      setAfter(null);
      (e.target as HTMLFormElement).reset();
      await onAdded();
    } catch (err) {
      // Якщо фото залилися, а рядок не створився — прибираємо файли.
      // Інакше сховище поволі заростає сиротами, яких нічим не знайти.
      if (uploaded.length) await sb.storage.from(RESULTS_BUCKET).remove(uploaded);
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }

    async function upload(file: File): Promise<string> {
      const blob = await compressToWebp(file);
      const path = `${crypto.randomUUID()}.webp`;
      const { error } = await sb.storage
        .from(RESULTS_BUCKET)
        .upload(path, blob, { contentType: 'image/webp' });
      if (error) throw new Error(`Не вдалося завантажити фото: ${error.message}`);
      return path;
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-[#f6f2f8] p-4">
      <h3 className="m-0 mb-3 font-display text-[14.5px] font-bold text-ink">Додати картку</h3>

      <div className="mb-3 grid gap-2.5 sm:grid-cols-3">
        <Field label="Ім'я" value={name} onChange={setName} max={LIMITS.name} placeholder="Марія" />
        <Field label="Вік" value={age} onChange={setAge} max={LIMITS.age} placeholder="26 років" />
        <Field
          label="Тривалість"
          value={weeks}
          onChange={setWeeks}
          max={LIMITS.weeks}
          placeholder="8 тижнів марафону"
        />
      </div>

      <div className="mb-4 grid gap-2.5 sm:grid-cols-2">
        <FileField label="Фото «до»" file={before} onPick={setBefore} />
        <FileField label="Фото «після»" file={after} onPick={setAfter} />
      </div>

      <button
        type="submit"
        disabled={!ready || busy}
        className="rounded-pill bg-magenta px-6 py-3 font-display text-[14px] font-bold text-white disabled:opacity-40"
      >
        {busy ? 'Додаємо…' : 'Додати картку'}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  max,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12.5px] font-semibold text-ink">{label}</span>
      <input
        type="text"
        required
        maxLength={max}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-[14.5px] text-ink outline-none focus:border-magenta"
      />
    </label>
  );
}

function FileField({
  label,
  file,
  onPick,
}: {
  label: string;
  file: File | null;
  onPick: (f: File | null) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12.5px] font-semibold text-ink">{label}</span>
      <input
        type="file"
        required
        accept="image/*"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        className="w-full text-[13px] text-muted file:mr-3 file:rounded-pill file:border-0 file:bg-ink file:px-4 file:py-2 file:text-[13px] file:font-bold file:text-white"
      />
      {file && <span className="mt-1 block truncate text-[12px] text-muted">{file.name}</span>}
    </label>
  );
}

function Thumb({ src, alt }: { src?: string; alt: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- підписане посилання
    // на приватний bucket, next/image з ним не працює й тут не потрібен.
    <img src={src} alt={alt} className="h-14 w-11 rounded-lg object-cover" />
  ) : (
    <span className="block h-14 w-11 rounded-lg bg-black/10" />
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="h-9 w-9 rounded-full border border-black/15 text-[14px] font-bold text-ink disabled:opacity-30"
    >
      {children}
    </button>
  );
}
