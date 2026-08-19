-- ملاحظاتُ المراجعة والمقابلة — **سجلٌّ يُضاف إليه، لا حقلٌ يُكتب فوقه**.
--
-- ⚠️ **ولذلك لم يُستعمل عمود `notes` الموجود منذ أوّل هجرة.** رئيسُ اللجنة
-- ونائبُه يدخلان بالنطاق نفسِه ويقابلان في اليوم نفسِه؛ فحقلٌ واحدٌ يعني
-- أن يمحو أحدُهما ملاحظةَ الآخر بلا أن يعلم — وملاحظةُ مقابلةٍ ضاعت لا
-- تُستعاد إلّا بإعادة المقابلة. والسجلُّ يحفظ الاثنتين ويقول من كتب ومتى.
--
-- ويبقى `notes` كما هو: فارغٌ لم يُكتب فيه شيءٌ قطّ (لا في الشيفرة ولا في
-- البيانات)، وحذفُه عمودًا ليس من شغل هذي الهجرة.

create table public.application_notes (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid not null
    references public.applications(id) on delete cascade,

  -- ⚠️ **يُختمان بمحفِّزٍ لا يرسلهما العميل** — انظر `stamp_note_author`.
  author_email   text not null default '',
  author_name    text not null default '',

  body           text not null
    check (length(btrim(body)) between 1 and 2000),

  created_at     timestamptz not null default now(),
  updated_at     timestamptz
);

comment on table public.application_notes is
  'ملاحظات الطاقم على الطلبات. سجلٌّ يُضاف إليه — لكلّ ملاحظةٍ كاتبُها ووقتها.';
comment on column public.application_notes.author_email is
  'يُملأ من الرمز بمحفِّز `stamp_note_author` — لا يُقبل من العميل.';

-- القراءةُ دائمًا بترتيبٍ زمنيّ داخل طلبٍ واحد
create index application_notes_app_idx
  on public.application_notes (application_id, created_at desc);

-- ── مَن يرى هذا الطلب أصلًا؟ ────────────────────────────────────────────
-- ⚠️ **قاعدةُ العزل نفسُها، مكتوبةً مرّةً واحدة.** نسخُها في كلّ سياسةٍ
-- يعني أن يُشدَّد العزلُ يومًا في موضعٍ ويُنسى في آخر.
--
-- ⚠️ **وفي `private` لا `public`** — التزامًا بهجرة ١٤٢٢ ٠٠٢١ (تحصين
-- الدوالّ): `public` مكشوفٌ عبر PostgREST، فدالّةٌ `security definer` فيه
-- تصير نقطةَ `/rest/v1/rpc/` يستدعيها أيُّ زائرٍ لسبر الطلبات بمعرّفاتها.
create or replace function private.can_read_application(app_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.applications a
    where a.id = app_id
      and (
        private.current_staff_role() = 'admin'
        or (
          private.current_staff_role() = 'leader'
          and (
            private.choice_in_scopes(a.choice1, private.current_staff_scopes())
            or private.choice_in_scopes(a.choice2, private.current_staff_scopes())
            or private.choice_in_scopes(a.choice3, private.current_staff_scopes())
          )
        )
      )
  )
$$;

revoke all    on function private.can_read_application(uuid) from public, anon;
grant  execute on function private.can_read_application(uuid) to authenticated;

-- ── ختمُ الكاتب ────────────────────────────────────────────────────────
-- ⚠️ **الاسمُ والبريدُ من الخادم لا من النموذج.** لو أرسلهما العميلُ لكتب
-- أحدُهم ملاحظةً باسم زميله — والملاحظةُ يُبنى عليها قرارُ قبولٍ أو اعتذار.
--
-- والاسمُ يُنسَخ لحظةَ الكتابة ولا يُقرأ لاحقًا بانضمام: سياسةُ `staff`
-- تمنع القائدَ من قراءة صفّ زميله، فانضمامٌ وقتَ العرض كان يُظهر بريدًا
-- خامًا بدل الاسم لكلّ ملاحظةٍ ليست له.
--
-- وتبقى في `public` كأختِها `staff_normalize_email`: دوالُّ المحفِّزات
-- تُرجع `trigger` فلا تُستدعى عبر PostgREST أصلًا، والحرزُ هو تثبيت
-- `search_path` لا نقلُ المخطَّط.
create or replace function public.stamp_note_author()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  who text := lower(auth.jwt() ->> 'email');
  nm  text;
begin
  new.author_email := who;
  select coalesce(nullif(btrim(s.display_name), ''), nullif(btrim(s.label), ''))
    into nm
  from public.staff s
  where s.email = who;
  new.author_name := coalesce(nm, who);
  return new;
end;
$$;

create trigger application_notes_stamp_author
  before insert on public.application_notes
  for each row execute function public.stamp_note_author();

-- ⚠️ **وقتُ التعديل يُختم في القاعدة لا في العميل.** ملاحظةٌ عُدّلت بعد
-- قرارٍ بُني عليها يجب أن تقول ذلك — والعميلُ الذي يرسل وقتَه لا يُصدَّق:
-- ساعتُه قد تكون خطأً، وقد يحذف الحقلَ فتبدو الملاحظةُ كما كُتبت أوّلًا.
create or replace function public.touch_note()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin
  -- الكاتبُ والطلبُ لا يُنقلان بتعديل: ملاحظةٌ تُنسب إلى غير كاتبها أو
  -- تُعلَّق على طلبٍ آخر تفسد السجلَّ بلا أثرٍ يُرى.
  new.author_email   := old.author_email;
  new.author_name    := old.author_name;
  new.application_id := old.application_id;
  new.created_at     := old.created_at;
  new.updated_at     := now();
  return new;
end;
$$;

create trigger application_notes_touch
  before update on public.application_notes
  for each row execute function public.touch_note();

-- ── السياسات ───────────────────────────────────────────────────────────
alter table public.application_notes enable row level security;

create policy "الطاقم يقرأ ملاحظات ما في نطاقه"
  on public.application_notes for select to authenticated
  using (private.can_read_application(application_id));

-- ⚠️ شرطُ البريد لازمٌ **مع** المحفِّز لا بدلًا عنه: المحفِّزُ يضبط القيمة،
-- والسياسةُ تضمن ألّا يمرّ صفٌّ لو عُطِّل المحفِّزُ يومًا في هجرةٍ لاحقة.
create policy "الطاقم يكتب ملاحظةً باسمه"
  on public.application_notes for insert to authenticated
  with check (
    private.can_read_application(application_id)
    and author_email = lower(auth.jwt() ->> 'email')
  );

-- ⛔ **لا أحدَ يعدّل ملاحظةَ غيرِه ولا يحذفها — ولا الرئاسة.** الملاحظةُ
-- شهادةُ من حضر المقابلة، ومحوُ شهادةِ غيرِك يفسد السجلَّ الذي وُجد ليمنع
-- الضياع. والخطأُ يُصحَّح بملاحظةٍ ثانية.
create policy "الكاتبُ يعدّل ملاحظته"
  on public.application_notes for update to authenticated
  using (author_email = lower(auth.jwt() ->> 'email'))
  with check (author_email = lower(auth.jwt() ->> 'email'));

create policy "الكاتبُ يحذف ملاحظته"
  on public.application_notes for delete to authenticated
  using (author_email = lower(auth.jwt() ->> 'email'));
