alter table public.applications
  add column if not exists has_club_experience boolean not null default false,
  add column if not exists club_experience text;

comment on column public.applications.has_club_experience is
  'خبرة سابقة في نادٍ أو لجنة أو عمل تطوّعي — سؤال عام يُسأل مرّة واحدة لكل متقدّم، لا مرّة لكل رغبة';

comment on column public.applications.club_experience is
  'تفاصيل الخبرة: الجهة والدور. null لمن لا خبرة له — لا سلسلة فارغة';

-- الحقلان يتحرّكان معًا أو لا يتحرّكان: «نعم» بلا تفاصيل صفٌّ لا يُقرأ،
-- و«لا» مع تفاصيل صفٌّ يكذب على من يفرز.
alter table public.applications
  drop constraint if exists applications_club_experience_consistent;

alter table public.applications
  add constraint applications_club_experience_consistent check (
    (has_club_experience and club_experience is not null and length(btrim(club_experience)) > 0)
    or (not has_club_experience and club_experience is null)
  );