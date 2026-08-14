-- تحصين الدوالّ المساعدة بناءً على مستشار Supabase الأمنيّ.
--
-- ⚠️ **المشكلة:** الدوالّ كانت في `public`، و`public` مكشوفٌ عبر PostgREST —
-- فصارت `current_staff_role()` نقطةَ `/rest/v1/rpc/` يستدعيها أيُّ زائر.
-- وهي `security definer`، أي تعمل بصلاحيات مالكها وتتجاوز RLS.
--
-- **العلاج:** مخطَّطٌ خاصّ غير مكشوف. السياسات تستدعيه بلا مشكلة (نفس
-- المعاملة)، ولا وجود له في واجهة `REST`. ولا يكفي `revoke execute` من
-- `authenticated`: السياسات تُقيَّم بصلاحيات المستخدم السائل، فنزعُها منه
-- يكسر القراءة كلّها.

create schema if not exists private;
revoke all on schema private from anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.current_staff_role()
returns text
language sql stable security definer
set search_path = public, pg_temp
as $$
  select s.role from public.staff s
  where s.email = lower(auth.jwt() ->> 'email')
$$;

create or replace function private.current_staff_scopes()
returns text[]
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce(s.scopes, '{}') from public.staff s
  where s.email = lower(auth.jwt() ->> 'email')
$$;

create or replace function private.choice_in_scopes(choice text, scopes text[])
returns boolean
language sql immutable
set search_path = pg_catalog, pg_temp
as $$
  select exists (
    select 1 from unnest(scopes) as s
    where choice = s or choice like s || '/%'
  )
$$;

revoke all on function private.current_staff_role()   from public, anon;
revoke all on function private.current_staff_scopes() from public, anon;
revoke all on function private.choice_in_scopes(text, text[]) from public, anon;
grant execute on function private.current_staff_role()   to authenticated;
grant execute on function private.current_staff_scopes() to authenticated;
grant execute on function private.choice_in_scopes(text, text[]) to authenticated;

-- إعادة بناء السياسات على النسخ الخاصّة
drop policy if exists "الطاقم يقرأ ما في نطاقه"        on public.applications;
drop policy if exists "الطاقم يحدّث حالة ما في نطاقه"   on public.applications;
drop policy if exists "كلٌّ يقرأ صفّه"                  on public.staff;
drop policy if exists "الرئاسة تقرأ الطاقم"             on public.staff;
drop policy if exists "الرئاسة تدير الطاقم"             on public.staff;

create policy "الطاقم يقرأ ما في نطاقه"
  on public.applications for select to authenticated
  using (
    private.current_staff_role() = 'admin'
    or (
      private.current_staff_role() = 'leader'
      and (
        private.choice_in_scopes(choice1, private.current_staff_scopes())
        or private.choice_in_scopes(choice2, private.current_staff_scopes())
        or private.choice_in_scopes(choice3, private.current_staff_scopes())
      )
    )
  );

create policy "الطاقم يحدّث حالة ما في نطاقه"
  on public.applications for update to authenticated
  using (
    private.current_staff_role() = 'admin'
    or (
      private.current_staff_role() = 'leader'
      and (
        private.choice_in_scopes(choice1, private.current_staff_scopes())
        or private.choice_in_scopes(choice2, private.current_staff_scopes())
        or private.choice_in_scopes(choice3, private.current_staff_scopes())
      )
    )
  )
  with check (private.current_staff_role() in ('admin', 'leader'));

create policy "كلٌّ يقرأ صفّه"
  on public.staff for select to authenticated
  using (email = lower(auth.jwt() ->> 'email'));

create policy "الرئاسة تدير الطاقم"
  on public.staff for all to authenticated
  using (private.current_staff_role() = 'admin')
  with check (private.current_staff_role() = 'admin');

drop function if exists public.current_staff_role();
drop function if exists public.current_staff_scopes();
drop function if exists public.choice_in_scopes(text, text[]);

-- دالّة المُشغِّل: تعمل داخليًّا ولا تُستدعى من الواجهة، لكن `search_path`
-- المفتوح يبقى ثغرةَ خطفٍ بجدولٍ مزروع.
create or replace function public.staff_normalize_email()
returns trigger language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$$;
