-- ════════════════════════════════════════════════════════════════════
-- Контент, який редагує Марина через /admin: дата старту й картки
-- «Результати учасниць».
--
-- Виконати ОДИН РАЗ у Supabase → SQL Editor (проєкт marinek-store).
-- MCP-підключення організацію Марини не бачить, тому міграції їдуть
-- текстом на вставку, а не автоматом.
--
-- Головна ідея тут: база — це чернетка, а не сайт. Сайт статичний і
-- читає ці таблиці лише під час збірки. Тому будь-яка правка в /admin
-- нічого на живому сайті не міняє, поки Марина не натисне «Опублікувати».
-- Це і є захист від «щось натиснула і все зламалось».
-- ════════════════════════════════════════════════════════════════════

-- ── Дата старту потоку ──────────────────────────────────────────────
-- Один рядок, id завжди 1: рядків більше бути не може, і код ніколи
-- не має гадати, який з них справжній.
create table if not exists site_content (
  id           smallint primary key default 1 check (id = 1),
  -- Формат ДД.ММ зав'язаний на чотири місця у вёрстці (hero, тарифи,
  -- фінальний CTA, sticky CTA) і на <title>. В адмінці стоїть календар,
  -- але перевірка потрібна й тут: форму можна обійти, таблицю — ні.
  start_date   text not null check (start_date ~ '^\d{2}\.\d{2}$'),
  updated_at   timestamptz not null default now(),
  published_at timestamptz
);

insert into site_content (id, start_date)
values (1, '03.08')
on conflict (id) do nothing;

-- ── Картки «до / після» ─────────────────────────────────────────────
create table if not exists results (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(btrim(name)) between 1 and 40),
  age         text not null check (length(btrim(age)) between 1 and 24),
  weeks       text not null check (length(btrim(weeks)) between 1 and 32),
  -- Шляхи всередині bucket'а, не URL. URL у Supabase залежить від
  -- домену проєкту й від того, публічний bucket чи ні; шлях — ні.
  before_path text not null,
  after_path  text not null,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

-- ── Хто саме має право редагувати ───────────────────────────────────
-- Поіменний список. Спокуса була написати політики просто для ролі
-- `authenticated` — мовляв, реєстрація в проєкті вимкнена, отже це й
-- так одна Марина. Але тоді весь захист кабінету тримався б на одному
-- перемикачі в дашборді: варто його колись увімкнути (випадково або щоб
-- зробити входи покупчиням) — і будь-хто, хто зареєструвався, отримує
-- право переписати контент сайту. Тому право дає не факт входу, а рядок
-- у цій таблиці.
create table if not exists admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

-- Політик нема жодної: список адміністраторів не читається через API
-- взагалі й нікому. Він потрібен лише всередині перевірок нижче.
alter table admins enable row level security;

-- security definer — щоб перевірка бачила таблицю admins попри RLS на
-- ній самій. Без цього підзапит повертав би порожньо і не пускав нікого.
create or replace function is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- ── RLS ─────────────────────────────────────────────────────────────
-- Політик для anon НЕМА і не буде: неавторизований браузер не читає ці
-- таблиці взагалі. Збірка ходить під service_role, який RLS обходить.
alter table site_content enable row level security;
alter table results      enable row level security;

drop policy if exists "content read"   on site_content;
drop policy if exists "content write"  on site_content;
create policy "content read"  on site_content for select to authenticated using (is_admin());
create policy "content write" on site_content for update to authenticated
  using (is_admin()) with check (is_admin());
-- insert/delete не даємо навмисно: рядок рівно один і він уже є.

drop policy if exists "results read"   on results;
drop policy if exists "results insert" on results;
drop policy if exists "results update" on results;
drop policy if exists "results delete" on results;
create policy "results read"   on results for select to authenticated using (is_admin());
create policy "results insert" on results for insert to authenticated with check (is_admin());
create policy "results update" on results for update to authenticated
  using (is_admin()) with check (is_admin());
create policy "results delete" on results for delete to authenticated using (is_admin());

-- ── Позначка «є неопубліковані зміни» ───────────────────────────────
-- Щоб адмінка могла чесно сказати «на сайті ще старе». Рахуємо як
-- published_at is null or published_at < updated_at.
create or replace function touch_site_content() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  update site_content set updated_at = now() where id = 1;
  return null;
end $$;

drop trigger if exists results_touch on results;
create trigger results_touch
  after insert or update or delete on results
  for each statement execute function touch_site_content();

-- Оновлюємо updated_at лише коли справді змінилася дата. Інакше сама
-- публікація (вона пише published_at) зсувала б updated_at і адмінка
-- вічно показувала б «є неопубліковані зміни».
create or replace function touch_start_date() returns trigger
  language plpgsql as $$
begin
  if new.start_date is distinct from old.start_date then
    new.updated_at = now();
  end if;
  return new;
end $$;

drop trigger if exists site_content_touch on site_content;
create trigger site_content_touch
  before update on site_content
  for each row execute function touch_start_date();

-- ── Сховище фото ────────────────────────────────────────────────────
-- Bucket ПРИВАТНИЙ. Живий сайт ці файли не віддає: збірка викачує їх
-- у public/uploads і далі їх роздає CDN Netlify. Отже, публічний доступ
-- до сховища не потрібен, а зайвий відкритий шлях — зайва поверхня.
--
-- file_size_limit і allowed_mime_types — не дублювання браузерного
-- стиснення, а страховка від нього: якщо стиснення колись зламається,
-- знімок з телефона на 4 МБ має впертися в базу, а не в перший екран.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('results', 'results', false, 1048576, array['image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "results objects read"   on storage.objects;
drop policy if exists "results objects insert" on storage.objects;
drop policy if exists "results objects delete" on storage.objects;
create policy "results objects read" on storage.objects for select to authenticated
  using (bucket_id = 'results' and is_admin());
create policy "results objects insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'results' and is_admin());
create policy "results objects delete" on storage.objects for delete to authenticated
  using (bucket_id = 'results' and is_admin());

-- ── Видати доступ Марині ────────────────────────────────────────────
-- Акаунт має існувати ДО цього кроку (Authentication → Users, або через
-- Admin API — див. docs/admin-setup.md). Доки рядка тут немає, кабінет
-- порожній навіть для неї: це не поломка, а поіменний список у дії.
insert into admins (user_id, note)
select id, 'Марина'
from auth.users
where email = 'ЗАМІНИТИ_НА_ПОШТУ_МАРИНИ'
on conflict (user_id) do nothing;

-- Якщо пошту не замінили або написали з помилкою, попередній запит
-- нічого не зробить і промовчить — а кабінет потім просто не відкриється,
-- і причина буде незрозуміла. Тому одразу голосно перевіряємо.
do $$
begin
  if not exists (select 1 from admins) then
    raise exception 'Таблиця admins порожня. Перевірте пошту в запиті вище: акаунт із такою адресою в Authentication → Users не знайдено.';
  end if;
end $$;
