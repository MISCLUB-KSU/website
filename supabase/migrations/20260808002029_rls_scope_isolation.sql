-- عزل الاطّلاع: كل قائدٍ يرى طلبات نطاقه وحده، والرئاسة ترى الكلّ.
-- يُفرَض هنا في قاعدة البيانات لا في الواجهة: واجهةٌ مكسورة أو استعلامٌ
-- مباشر من المتصفّح لا يتجاوز هذي السياسات.

alter table public.applications enable row level security;
alter table public.staff        enable row level security;

-- ── دوالّ مساعدة ───────────────────────────────────────────────────────
-- `security definer` لأنها تقرأ `staff` وسياساتُه تمنع القراءة العامّة،
-- و`search_path` مثبَّت فلا يُخطَف بجدولٍ مزروع في مسارٍ آخر.

create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select s.role from public.staff s
  where s.email = lower(auth.jwt() ->> 'email')
$$;

create or replace function public.current_staff_scopes()
returns text[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(s.scopes, '{}') from public.staff s
  where s.email = lower(auth.jwt() ->> 'email')
$$;

-- المطابقة ببادئة: نطاق اللجنة يشمل وحداتها.
-- ⚠️ الشرطة المائلة لازمة في `like`: بدونها يطابق `committee:pr` نطاقُ
-- `committee:press` أيضًا، فيرى قائدٌ طلباتِ لجنةٍ أخرى.
create or replace function public.choice_in_scopes(choice text, scopes text[])
returns boolean
language sql
immutable
as $$
  select exists (
    select 1 from unnest(scopes) as s
    where choice = s or choice like s || '/%'
  )
$$;

-- ── سياسات الطلبات ─────────────────────────────────────────────────────
-- لا سياسةَ `insert` إطلاقًا: الكتابة تمرّ بمفتاح الخدمة من الخادم وحده،
-- فلا يستطيع متصفّحٌ حقن طلبٍ ولو عرف عنوان القاعدة.

create policy "الطاقم يقرأ ما في نطاقه"
  on public.applications for select to authenticated
  using (
    public.current_staff_role() = 'admin'
    or (
      public.current_staff_role() = 'leader'
      and (
        public.choice_in_scopes(choice1, public.current_staff_scopes())
        or public.choice_in_scopes(choice2, public.current_staff_scopes())
        or public.choice_in_scopes(choice3, public.current_staff_scopes())
      )
    )
  );

-- الحالة والملاحظات تُحدَّث، والبيانات الشخصية لا تُمسّ من الواجهة.
create policy "الطاقم يحدّث حالة ما في نطاقه"
  on public.applications for update to authenticated
  using (
    public.current_staff_role() = 'admin'
    or (
      public.current_staff_role() = 'leader'
      and (
        public.choice_in_scopes(choice1, public.current_staff_scopes())
        or public.choice_in_scopes(choice2, public.current_staff_scopes())
        or public.choice_in_scopes(choice3, public.current_staff_scopes())
      )
    )
  )
  with check (
    public.current_staff_role() = 'admin'
    or public.current_staff_role() = 'leader'
  );

-- ── سياسات الطاقم ──────────────────────────────────────────────────────
-- كلٌّ يقرأ صفّه ليعرف دوره ونطاقه؛ والرئاسة وحدها تقرأ القائمة وتعدّلها.

create policy "كلٌّ يقرأ صفّه"
  on public.staff for select to authenticated
  using (email = lower(auth.jwt() ->> 'email'));

create policy "الرئاسة تقرأ الطاقم"
  on public.staff for select to authenticated
  using (public.current_staff_role() = 'admin');

create policy "الرئاسة تدير الطاقم"
  on public.staff for all to authenticated
  using (public.current_staff_role() = 'admin')
  with check (public.current_staff_role() = 'admin');
