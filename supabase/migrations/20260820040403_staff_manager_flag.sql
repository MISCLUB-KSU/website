-- ══════════════════════════════════════════════════════════════════════
-- إدارةُ الطاقم تضيق من «كلّ رئاسة» إلى «من يملك العلامة»
--
-- ⚠️ **لماذا عمودٌ لا سطرٌ في الشيفرة.** المطلوبُ أن يدير الطاقمَ واحدٌ
--    بعينه لا كلُّ من دورُه `admin`. وتثبيتُ بريدٍ في المستودع يخالف قاعدةَ
--    النادي («لا أسماء أشخاص في موادّه») **ويموت عند تبديل الدورة** — إذ
--    يلزم تعديلُ شيفرةٍ ونشرٌ لتسليم مهمّةٍ إداريّة. فالعلامةُ بيانٌ يُمنح
--    بتحديثٍ في القاعدة.
--
-- ⚠️ **ولماذا أضيقُ من `admin` أصلًا.** الرئاسةُ كلُّها ترى الطلبات وتفتح
--    المراحل؛ **وإدارةُ الطاقم بابٌ آخر**: من يملكها يملك أن يمنح غيرَه
--    الاطّلاعَ على كلّ الطلبات **بأرقام أحوال أصحابها**. فلا تُشتقّ من دورٍ
--    يُمنح لأسبابٍ أخرى.
--
-- ⚠️ **والحارسُ هنا لا في الواجهة.** إخفاءُ تبويبٍ ليس أمانًا: من يعرف
--    العنوان يستدعي الفعلَ الخادميَّ مباشرةً. فالسياسةُ هي التي تردّ،
--    والشاشةُ تتبعها.
-- ══════════════════════════════════════════════════════════════════════

alter table public.staff
  add column if not exists manages_staff boolean not null default false;

comment on column public.staff.manages_staff is
  'من يملك إدارةَ الطاقم — أضيقُ من role=admin. تُمنح بتحديثٍ مباشر، ولا تُشتقّ من الدور.';

-- ⚠️ **دالّةٌ في `private` لا شرطٌ داخل السياسة.** سياسةٌ على `staff` تقرأ
--    `staff` تدخل في **تكرارٍ لا نهائيّ** — ولذلك بُنيت `current_staff_role`
--    هكذا، وهذي تتبع نمطَها حرفًا بحرف: `stable` و`security definer`
--    و`search_path` مثبَّت.
create or replace function private.current_manages_staff()
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select coalesce(s.manages_staff, false) from public.staff s
  where s.email = lower(auth.jwt() ->> 'email')
$$;

-- ⚠️ **والسياسةُ القديمة كانت `ALL` — أي تشمل القراءة أيضًا.** فبعد
--    التضييق يقرأ كلُّ عضوٍ صفَّه وحدَه عبر «كلٌّ يقرأ صفّه»، ولا يرى الرئيسُ
--    الآخرُ بقيّةَ الطاقم. وهذا مقصود: من لا يديره لا يحتاج قائمتَه.
--
-- ⚠️ **وترتيبُ التطبيق مهمّ:** تُمنح العلامةُ لمن سيديره **قبل** تبديل
--    السياسة. والعكسُ يقفل البابَ على الجميع، ولا يُفتح إلّا من لوحة
--    Supabase.
drop policy if exists "الرئاسة تدير الطاقم" on public.staff;

create policy "من يملك العلامة يدير الطاقم"
  on public.staff
  for all
  to authenticated
  using (
    private.current_staff_role() = 'admin'
    and private.current_manages_staff()
  )
  with check (
    private.current_staff_role() = 'admin'
    and private.current_manages_staff()
  );
