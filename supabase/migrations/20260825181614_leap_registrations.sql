-- تسجيل حضور النادي في LEAP 2026 — جدولٌ مستقلٌّ عن `applications`.
--
-- ⚠️ **مُطبَّقٌ على الإنتاج (٢٥ أغسطس ٢٠٢٦) عبر `apply_migration`، لا
-- `db push`.** المستودعُ غير مربوطٍ بالمشروع ولا access token، و`db push`
-- يلزمه كلمةُ مرور القاعدة. والطابعُ الزمنيُّ في اسم الملفّ **غُيِّر
-- ليطابق** ما سجّلته Supabase (`20260825181614`) — بغيرِه يظنّ أيُّ
-- `db push` لاحقٍ أن الترحيلَ معلَّقٌ فيعيد تشغيله.
--
-- **لماذا جدولٌ ثانٍ لا حقولٌ في الأول؟** `applications` طلبُ عضويةٍ يُقيَّم
-- ويُقبل ويُرفض، وله حالةٌ ومراجعٌ وسيرةٌ ذاتية. وهذا سجلُّ حضورِ فعاليةٍ
-- خارجية: لا يُقيَّم، ولا يُرفض، ولا علاقة له بالعضوية — ومن يسجّل هنا قد
-- لا يكون عضوًا أصلًا. دمجُهما يعني أعمدةً فارغةً في كلا الاتجاهين وحالةً
-- لا معنى لها.

create table if not exists public.leap_registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  /* الاسمان: العربيُّ للبطاقة، واللاتينيُّ لما يُقرأ في المؤتمر */
  name_ar text not null,
  name_en text not null,

  email text not null,
  phone text not null,

  /* رقم الحجز من رسالة LEAP — `Unique Reference Number` */
  reference text not null
);

-- ⚠️ **التفرّد على رقم الحجز لا على البريد.** رقمُ الحجز هويةُ التذكرة
-- نفسها: تذكرةٌ واحدة = بطاقةٌ واحدة. والبريدُ ليس مفتاحًا — طالبٌ يسجّل
-- بجواله وآخرُ ببريد العائلة نفسه ليس تكرارًا، وردُّه خسارةُ حاضرٍ حقيقيّ.
-- والتخزينُ بحروفٍ كبيرةٍ موحَّدة لأن الطالب ينسخ الرقم من رسالةٍ قد
-- يكتبها بحالةٍ مختلفة، فـ`ABC123` و`abc123` تذكرةٌ واحدة لا اثنتان.
create unique index if not exists leap_registrations_reference_key
  on public.leap_registrations (upper(btrim(reference)));

-- الأحدث أولًا في لوحة الإدارة
create index if not exists leap_registrations_created_at_idx
  on public.leap_registrations (created_at desc);

-- ⚠️ **`RLS` مُفعَّلةٌ بلا سياسةِ إدراجٍ بتاتًا — عمدًا، ونفسُ نمطِ
-- `applications`.** الطالب لا يملك حسابًا، فلا هويّةَ تُمنح لها سياسة.
-- الإدراجُ يمرّ من `Server Action` بمفتاح الخدمة بعد أن يجتاز التحقّق في
-- `src/lib/leap.ts` — **والتحقّقُ هو الحارس، لا `RLS`**. وتفعيلُها هنا
-- يمنع القراءةَ والكتابةَ من المفتاح العلنيّ في المتصفّح، وهو المقصود:
-- الجدول فيه بريدٌ وجوّالٌ لطلابٍ حقيقيّين.
alter table public.leap_registrations enable row level security;

comment on table public.leap_registrations is
  'تسجيل حضور أعضاء النادي في LEAP 2026 (٣١ أغسطس – ٣ سبتمبر ٢٠٢٦، RECC ملهم). يُدرَج بمفتاح الخدمة من /leap.';
comment on column public.leap_registrations.reference is
  'رقم الحجز من رسالة LEAP (Unique Reference Number) — مفتاح التفرّد.';
