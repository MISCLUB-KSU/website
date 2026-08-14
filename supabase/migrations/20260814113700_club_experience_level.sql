-- درجةُ الخبرة: تجربةٌ واحدة أم أكثر — لا «نعم/لا» وحدها.
--
-- طلبه وركفلو InterMission صراحةً بثلاثة خيارات. والفرق ليس تجميلًا:
-- من شارك في نادٍ واحدٍ فصلًا ومن قاد ثلاث لجان يقعان اليوم في خانةٍ
-- واحدة، ولجنةُ الفرز تقرأ نصَّ التفاصيل لتفرّق بينهما — أي أنها تفرز
-- بالقراءة لا بالعمود.
--
-- ⚠️ **والبوليان يبقى، ولا يُستبدل.** `has_club_experience` تجيب «هل له
-- خبرة» وعليها يقوم الفرزُ والقيدُ القائم؛ والعمودُ الجديد يزيد الدرجة.
-- واستبدالُها كان يكسر `applications_club_experience_consistent` وكلَّ
-- استعلامٍ في اللوحة، بلا مكسبٍ يوازيه.
--
-- ⚠️ **ورمزٌ لاتينيّ لا نصٌّ عربيّ.** الخيار يُعرض عربيًّا للطالب ويُخزَّن
-- `multiple`/`single`/`none` — فتعديلُ صيغة الخيار يومًا لا يكسر صفًّا
-- محفوظًا، ولا يُقارَن نصٌّ عربيّ حرفًا بحرف فيسقط بمسافةٍ أو همزة.

alter table public.applications
  add column if not exists club_experience_level text;

comment on column public.applications.club_experience_level is
  'درجة الخبرة: multiple (أكثر من تجربة) · single (تجربة واحدة) · none. يوافق has_club_experience ولا يناقضه';

alter table public.applications
  drop constraint if exists applications_club_experience_level_check;

-- ⚠️ `not valid`: الصفوف التجريبية الـ٣٦ سابقةٌ للعمود وقيمتُه فيها `null`،
-- فتحقّقٌ بأثرٍ رجعيّ يرفض الترحيل. يُفرَض على الجديد ويُترك القديم، ويُختم
-- بـ`validate constraint` بعد حذف التجريبيّ.
alter table public.applications
  add constraint applications_club_experience_level_check check (
    club_experience_level in ('multiple', 'single', 'none')
    -- والاتّساق مع البوليان: «لا خبرة» تعني `none` والعكس، فلا يقول صفٌّ
    -- «له خبرة» ودرجتُه `none`.
    and (club_experience_level = 'none') = (not has_club_experience)
  ) not valid;