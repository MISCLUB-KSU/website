-- طلبات العضوية وطاقم الاطّلاع عليها.
-- كل التعليقات بالعربية على نسق المستودع.

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- البيانات الشخصية
  full_name        text not null,
  student_id       text not null,
  national_id      text not null,
  phone            text not null,
  email            text not null,
  university       text not null,
  university_other text,
  level            text not null,
  major            text not null,
  major_other      text,

  -- الرغبات الثلاث بصيغة `committee:<لجنة>[/<وحدة>]` أو `project:<مشروع>`
  choice1 text not null,
  choice2 text not null,
  choice3 text not null,

  -- الأسئلة والمرفقات
  why        text not null,
  heard_from text not null,
  answers    jsonb not null default '{}'::jsonb,
  portfolio  text,
  linkedin   text,
  cv_path    text,

  -- المتابعة
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'accepted', 'rejected')),
  notes  text
);

comment on table public.applications is
  'طلبات عضوية النادي. تحوي بياناتٍ شخصية حسّاسة (رقم هوية، جوال) — لا تُقرأ إلا عبر سياسات RLS أدناه.';
comment on column public.applications.cv_path is
  'مسار الملف في مستودع `cv` الخاص. الرابط يُوقَّع من الخادم بعد التحقّق من النطاق — لا يُخدَم مباشرةً.';

-- ⚠️ **بلا قيد فريد على `student_id` عمدًا.** الطالب قد يعيد التقديم بعد
-- خطأ، أو في موسمٍ لاحق. والقيد يرفض طلبه الثاني برسالةٍ لا يفهمها، وضياعُ
-- طلبٍ أسوأ من تكراره. التكرار يُرى في لوحة الإدارة ويُعالَج بشريًّا.
create index applications_student_id_idx on public.applications (student_id);
create index applications_created_at_idx  on public.applications (created_at desc);
create index applications_choices_idx     on public.applications (choice1, choice2, choice3);

-- ─────────────────────────────────────────────────────────────────────
-- الطاقم: من يرى ماذا.
create table public.staff (
  email      text primary key,
  role       text not null check (role in ('admin', 'leader')),
  -- نطاقات القائد بصيغة الرغبات نفسها. `admin` يرى الكلّ فتبقى فارغة.
  scopes     text[] not null default '{}',
  label      text,
  created_at timestamptz not null default now()
);

comment on table public.staff is
  'قائمة الإيميلات المسموح لها بالاطّلاع. الفصل يُفرَض هنا وفي RLS لا في الواجهة.';
comment on column public.staff.scopes is
  'نطاقات القائد. المطابقة ببادئة: نطاق `committee:pr` يشمل `committee:pr/sponsorship`.';
comment on column public.staff.label is
  'وصفٌ للدور (مثل «قائد لجنة العلاقات») لا اسم شخص — قاعدة المستودع: لا أسماء.';

-- البريد يُطبَّع صغيرًا دائمًا فلا يدخل أحدٌ بفارق حالة أحرف
create or replace function public.staff_normalize_email()
returns trigger language plpgsql as $$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$$;

create trigger staff_normalize_email_trg
  before insert or update on public.staff
  for each row execute function public.staff_normalize_email();
