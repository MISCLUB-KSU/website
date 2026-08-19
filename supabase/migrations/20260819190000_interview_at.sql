-- موعدُ المقابلة.
--
-- ⚠️ **كان يُكتب في الملاحظات نصًّا، وهذا يكفي لقراءته ولا يكفي لأيّ شيءٍ
-- آخر.** «قابلته الثلاثاء ٤ عصرًا» لا تُرتَّب ولا تُصفَّى ولا تُذكِّر، ومن
-- يفتح اللوحة صباحًا لا يعرف من عنده اليوم إلّا بقراءة كلّ ملاحظة.
--
-- ⚠️ **والموعدُ يخصّ الجهةَ التي هو عندها الآن.** فمن نزل إلى رغبته
-- التالية يُمسح موعدُه في `pass_over` — وإلّا رأى قائدُ الرتبة الثانية
-- موعدًا ضربه غيرُه ولم يحضره أحد.

alter table public.applications
  add column interview_at timestamptz;

comment on column public.applications.interview_at is
  'موعد المقابلة عند الجهة التي هو عندها الآن. يُمسح عند التمرير.';

-- الطابورُ يُرتَّب بالموعد حين يُطلب، والفهرسُ يتبع القراءة
create index applications_interview_at_idx
  on public.applications (interview_at)
  where interview_at is not null;

-- ── الحارس يسمح به ─────────────────────────────────────────────────────
-- ⚠️ **بلا هذا السطر لا يُكتب الموعدُ أصلًا.** الحارسُ يعيد كلَّ حقلٍ إلى
-- ما كان إلّا الحالةَ وختمَ البريد، فضبطُ الموعد كان سيُردّ بـ«لا يُغيَّر من
-- اللوحة إلّا الحالة» — وهي رسالةٌ صحيحةٌ لحقلٍ لم يُؤذَن له بعد.
create or replace function public.guard_application_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  probe public.applications;
begin
  if private.current_staff_role() = 'admin' then
    return new;
  end if;

  -- الدورُ الفارغ = مفتاحُ الخدمة (ربطُ الملفّات وختمُ الإيصال)
  if private.current_staff_role() is null then
    return new;
  end if;

  -- السلّمُ وحدَه يحرّك `stage`، ويرفع رايتَه في `pass_over`
  if coalesce(current_setting('app.ladder', true), '') = 'on' then
    return new;
  end if;

  probe := old;
  probe.status            := new.status;
  probe.decision_mailed_at := new.decision_mailed_at;
  probe.interview_at      := new.interview_at;
  if probe is distinct from new then
    raise exception 'لا يُغيَّر من اللوحة إلّا الحالةُ والموعد'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ── التمرير يمسح الموعد ────────────────────────────────────────────────
create or replace function public.pass_over(app_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  a          public.applications;
  nxt        smallint;
  nxt_choice text;
begin
  select * into a from public.applications where id = app_id;
  if not found then
    return 'missing';
  end if;

  if private.current_staff_role() = 'leader' then
    if not private.choice_in_scopes(
         case a.stage
           when 1 then a.choice1
           when 2 then a.choice2
           else        a.choice3
         end,
         private.current_staff_scopes())
    then
      return 'denied';
    end if;
    if a.stage > private.current_phase() then
      return 'denied';
    end if;
  elsif private.current_staff_role() is distinct from 'admin' then
    return 'denied';
  end if;

  if a.status in ('accepted', 'rejected') then
    return 'decided';
  end if;

  nxt := a.stage + 1;
  nxt_choice := case nxt
                  when 2 then a.choice2
                  when 3 then a.choice3
                  else        ''
                end;

  perform set_config('app.ladder', 'on', true);

  if nxt <= 3 and coalesce(btrim(nxt_choice), '') <> '' then
    -- ⚠️ الموعدُ يُمسح مع النزول: هو موعدُ الجهة السابقة لا موعدُ الشخص
    update public.applications
       set stage = nxt, status = 'new', interview_at = null
     where id = app_id;
    perform set_config('app.ladder', 'off', true);
    return 'moved';
  end if;

  update public.applications
     set status = 'rejected', interview_at = null
   where id = app_id;
  perform set_config('app.ladder', 'off', true);
  return 'rejected';
end;
$$;
