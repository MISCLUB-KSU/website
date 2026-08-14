-- الحالة الخامسة: **الإحالة إلى الرغبة الثانية**.
--
-- وعدت بها الإدارة قادةَ النادي (٩ أغسطس ٢٠٢٦): «يتم اتخاذ قرار الطلب بناءً على
-- خمس خيارات… ٥- الإحالة للرغبة الثانية».
--
-- ⚠️ **الوجهة تُشتقّ من الطلب لا يختارها القائد**: هي `choice2` التي كتبها
-- المتقدّم بنفسه. فلا حقلَ جديد ولا اختيار — القائد يقول «ليست لي» والنظام
-- يعرف إلى أين.
--
-- ⚠️⚠️ **ولا تغييرَ في `RLS`، وهذا مقيسٌ لا مفترَض**: سياسةُ القراءة
-- والتحديث تطابق `choice1 OR choice2 OR choice3` أصلًا — أي أن قائد الرغبة
-- الثانية **يرى الطلب منذ وصوله**. فالإحالة ليست فتحَ وصول، بل **إشارة**:
-- «قائد الأولى مرّرها، صارت عندك». وقائد الأولى يبقى يراها موسومةً محالة،
-- وهو ما طلبته الإدارة صراحةً: «يبقى ويكون محال للرغبة الثانية».
alter table public.applications
  drop constraint if exists applications_status_check;

alter table public.applications
  add constraint applications_status_check
  check (status in ('new', 'reviewing', 'accepted', 'rejected', 'referred'));

comment on column public.applications.status is
  'new · reviewing · accepted · rejected · referred (محال إلى choice2 — الوجهة مشتقّة من الطلب لا مختارة)';