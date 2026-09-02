-- سقفُ القبول يصير قفلًا: لا يُقبل أحدٌ فوقه، ولو كان الضاغطُ رئاسة.
-- والمخرجُ الوحيد رفعُ السقف نفسِه في public.capacity — وهو فعلٌ للرئاسة وحدها.

create table if not exists public.capacity (
  key        text primary key,
  label      text not null,
  cap        integer not null check (cap >= 0),
  vals       text[] not null,
  updated_at timestamptz not null default now()
);

alter table public.capacity enable row level security;

drop policy if exists capacity_read  on public.capacity;
drop policy if exists capacity_write on public.capacity;

-- كلُّ من في الطاقم يقرأ السقوف — القائدُ يحتاج أن يرى سقفَ جهته
create policy capacity_read on public.capacity
  for select using (private.current_staff_role() is not null);

-- ولا يعدّلها إلّا الرئاسة
create policy capacity_write on public.capacity
  for all
  using      (private.current_staff_role() = 'admin')
  with check (private.current_staff_role() = 'admin');

-- بذرةُ السقوف كما أعطتها الرئاسة — نسخةٌ طبقُ الأصل من src/content/capacity.ts
insert into public.capacity (key, label, cap, vals) values
  ('misthon',         'MISthon',                50, array['project:misthon']),
  ('misology',        'MISology',               50, array['project:misology']),
  ('intermission',    'InterMission',           35, array['project:intermission']),
  ('job-shadowing',   'Job Shadowing',          35, array['project:job-shadowing']),
  ('impact',          'Impact',                 32, array['project:impact']),
  ('sponsorship',     'وحدة الرعايات والشراكات', 15, array['committee:public-relations/sponsorship']),
  ('visits',          'وحدة الزيارات',           15, array['committee:public-relations/visits']),
  ('internal-comms',  'وحدة التواصل الداخلي',    25, array['committee:public-relations/internal-comms']),
  ('human-resources', 'لجنة الموارد البشرية',    20, array['committee:human-resources']),
  ('archive',         'وحدة الأرشيف والتقارير',  7,  array['committee:finance-operations/archive']),
  ('operations',      'وحدة العمليات',           25, array['committee:finance-operations/operations']),
  ('budget',          'وحدة إدارة الميزانية',    4,  array['committee:finance-operations/budget']),
  ('marketing',       'وحدة التسويق',            15, array['committee:media/content-writing','committee:media/creative-campaigns','committee:media/social-accounts']),
  ('photography',     'وحدة التصوير',            10, array['committee:media/photography-video','committee:media/video-editing']),
  ('design',          'وحدة التصميم',            15, array['committee:media/graphic-design'])
on conflict (key) do update
  set label = excluded.label, cap = excluded.cap, vals = excluded.vals, updated_at = now();

-- الجهةُ التي يقع فيها المتقدّم الآن: رغبتُه عند رتبته، لا رغبتُه الأولى دائمًا
create or replace function private.capacity_key(v text)
returns text language sql stable security definer
set search_path to 'public', 'pg_temp' as $$
  select c.key from public.capacity c where v = any (c.vals) limit 1;
$$;

create or replace function private.capacity_here(stage smallint, c1 text, c2 text, c3 text)
returns text language sql immutable
set search_path to 'public', 'pg_temp' as $$
  select private.capacity_key(case when stage = 1 then c1 when stage = 2 then c2 else c3 end);
$$;

-- الفحصُ نفسُه: يُستدعى بفرقِ المقبولين في هذي الجملة، لا بعددهم الكلّيّ.
-- ولذلك لا يمنع تعديلَ صفٍّ في جهةٍ متجاوزةٍ أصلًا (كضبط موعد مقابلة)،
-- ويمنع **زيادةَ** مقبولٍ واحدٍ عليها.
create or replace function private.capacity_assert(bucket text)
returns void language plpgsql security definer
set search_path to 'public', 'pg_temp' as $$
declare
  lim   integer;
  nm    text;
  total integer;
begin
  select c.cap, c.label into lim, nm from public.capacity c where c.key = bucket;
  if lim is null then return; end if;

  -- قفلٌ لكلّ جهةٍ حتى لا يمرّ قائدان معًا على آخر مقعد
  perform pg_advisory_xact_lock(hashtext('capacity:' || bucket));

  select count(*) into total
  from public.applications a
  where a.status = 'accepted'
    and private.capacity_here(a.stage, a.choice1, a.choice2, a.choice3) = bucket;

  if total > lim then
    raise exception 'سقفُ % ممتلئ — % مقبولًا من %. لا يُقبل أحدٌ فوق السقف؛ يُرفع السقفُ أوّلًا.', nm, total, lim
      using errcode = 'P0011';
  end if;
end $$;

create or replace function public.capacity_guard_update()
returns trigger language plpgsql security definer
set search_path to 'public', 'pg_temp' as $$
declare r record;
begin
  for r in
    with delta as (
      select private.capacity_here(stage, choice1, choice2, choice3) as k, 1 as n
        from newtab where status = 'accepted'
      union all
      select private.capacity_here(stage, choice1, choice2, choice3), -1
        from oldtab where status = 'accepted'
    )
    select k from delta where k is not null group by k having sum(n) > 0
  loop
    perform private.capacity_assert(r.k);
  end loop;
  return null;
end $$;

create or replace function public.capacity_guard_insert()
returns trigger language plpgsql security definer
set search_path to 'public', 'pg_temp' as $$
declare r record;
begin
  for r in
    select distinct private.capacity_here(stage, choice1, choice2, choice3) as k
      from newtab where status = 'accepted'
  loop
    if r.k is not null then perform private.capacity_assert(r.k); end if;
  end loop;
  return null;
end $$;

drop trigger if exists applications_capacity_update on public.applications;
create trigger applications_capacity_update
  after update on public.applications
  referencing old table as oldtab new table as newtab
  for each statement execute function public.capacity_guard_update();

drop trigger if exists applications_capacity_insert on public.applications;
create trigger applications_capacity_insert
  after insert on public.applications
  referencing new table as newtab
  for each statement execute function public.capacity_guard_insert();
