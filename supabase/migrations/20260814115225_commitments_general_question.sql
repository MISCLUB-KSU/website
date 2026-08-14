-- التزاماتُ الفصل — سؤالٌ عامٌّ لا سؤالُ لجنة.
--
-- ⚠️ كان في أسئلة اللجنة الإعلامية وحدها، فيُخزَّن في `answers` بمفتاح
-- `committee:media__commitments` ولا يُسأل إلّا من اختارها. والوقتُ المتاح
-- ليس شأنَ لجنةٍ بعينها: كلُّ قائدٍ يحتاجه ليعرف كم يحمّل العضو. فصار
-- عمودًا يُسأل مرّةً واحدةً لكل متقدّم، كسؤال الخبرة السابقة.
--
-- ⚠️ **مصفوفةٌ لا نصّ.** الجواب متعدّد («نادي آخر» و«تدريب/عمل» معًا)،
-- ونصٌّ مفصولٌ بفاصلٍ يُجبر كلَّ استعلامٍ على الشقّ — و`text[]` يُسأل
-- بـ`@>` و`&&` مباشرةً. وهي سابقةٌ قائمة في `staff.scopes`.
alter table public.applications
  add column if not exists commitments text[] not null default '{}';

comment on column public.applications.commitments is
  'التزامات الفصل: «نادي آخر» · «تدريب/عمل» · «لا يوجد». يُسأل مرّة واحدة لكل متقدّم';

alter table public.applications
  drop constraint if exists applications_commitments_check;

-- ⚠️ `not valid`: الصفوف السابقة للعمود قيمتُها `'{}'` بحكم `default`،
-- فتحقّقٌ بأثرٍ رجعيّ يرفض الترحيل. يُفرَض على الجديد ويُترك القديم.
-- والشرطان هما اللذان يفحصهما `refineFinal`: واحدٌ على الأقلّ، و«لا يوجد»
-- لا تجتمع مع غيرها.
alter table public.applications
  add constraint applications_commitments_check check (
    array_length(commitments, 1) >= 1
    and not ('لا يوجد' = any (commitments) and array_length(commitments, 1) > 1)
  ) not valid;