-- سؤالا من لا خبرة له: التصوّر والتوقّع.
--
-- ⚠️ **من قال «لا» كان يمرّ بلا كلمةٍ تُقرأ عنه.** مسارُ «نعم» يطلب الجهة
-- والدور، ومسارُ «لا» لا يطلب شيئًا — فتصل لجنةَ الفرز ورقةٌ عن طالبٍ بلا
-- سجلٍّ وبلا ما يدلّ عليه. والسؤالان لا يقيسان خبرة، بل **الفهم والتوقّع**،
-- وهما ما يُفرز به من لا سجلَّ له.

alter table public.applications
  add column if not exists club_perception text,
  add column if not exists club_expectation text;

comment on column public.applications.club_perception is
  'تصوّر المتقدّم عن الأندية الجامعية. يُسأل من قال «لا» وحده — null لمن له خبرة';

comment on column public.applications.club_expectation is
  'ما يتوقّع المتقدّم أن يعمله معنا. يُسأل من قال «لا» وحده — null لمن له خبرة';

-- التقابل نفسُه المفروض على `club_experience`، معكوسًا: حقلا من لا خبرة له
-- يمتلئان معًا أو يكونان `null` معًا. فلا صفَّ يقول «لي خبرة» ويحمل تصوّرَ
-- مبتدئ، ولا صفَّ بلا خبرةٍ وبلا جواب.
alter table public.applications
  drop constraint if exists applications_newcomer_answers_consistent;

-- ⚠️ **`not valid` عن قصد.** الجدول فيه اليوم صفوفٌ تجريبية سابقة لهذي
-- الأعمدة، بعضها `has_club_experience = false` وعموداه `null` — فتحقّقٌ
-- بأثرٍ رجعيّ يرفض الترحيل كلَّه. و`not valid` يفرض القيد على كل صفٍّ
-- **جديدٍ أو مُحدَّث** ويترك القديم، وهو المطلوب بالضبط.
-- وبعد حذف الصفوف التجريبية يُختم بـ:
--   alter table public.applications
--     validate constraint applications_newcomer_answers_consistent;
alter table public.applications
  add constraint applications_newcomer_answers_consistent check (
    (
      not has_club_experience
      and club_perception is not null
      and length(btrim(club_perception)) > 0
      and club_expectation is not null
      and length(btrim(club_expectation)) > 0
    )
    or (
      has_club_experience
      and club_perception is null
      and club_expectation is null
    )
  ) not valid;