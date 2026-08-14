-- مصدرُ الطلب: نموذجٌ مفتوحٌ برغباتٍ ثلاث، أو رابطٌ مباشرٌ لجهةٍ واحدة.
--
-- ⚠️ هذا العمود ليس بيانًا وصفيًّا، بل **شرطُ صدق كل رقمٍ في اللوحة**.
-- «الرغبة الأولى» في النموذج المفتوح تفضيلٌ بين بدائل؛ وفي الرابط المباشر
-- هي الخيار الوحيد المعروض. خلطُهما في عمودٍ واحد يجعل جهةً استقطبت
-- عشرين شخصًا برابطها تبدو أكثرَ جهةٍ مطلوبة في النادي، وهم لم يفاضلوا.
alter table public.applications
  add column if not exists source text not null default 'open';

alter table public.applications
  drop constraint if exists applications_source_check;

alter table public.applications
  add constraint applications_source_check
  check (source in ('open', 'direct'));

-- ── منعُ التكرار: فهرسان شرطيّان لا فهرسٌ واحد ────────────────────────────
--
-- ⚠️ القيد على (الهوية + الرغبة الأولى) وحده **فيه ثغرة**: من يقدّم على
-- النموذج المفتوح مرّتين ويقلب ترتيب رغباته تختلف رغبتُه الأولى فيمرّ.
-- فالمفتوح يُقيَّد بالهوية وحدها — طلبٌ واحد لكل شخص، يرتّب فيه ثلاثه.
create unique index if not exists applications_one_open_per_person
  on public.applications (national_id)
  where source = 'open';

-- وفي الروابط المباشرة يُقيَّد بالهوية والجهة: يجوز التقديم على MISthon
-- وJob Shadowing معًا، ولا يجوز على MISthon مرّتين.
create unique index if not exists applications_one_direct_per_target
  on public.applications (national_id, choice1)
  where source = 'direct';

comment on column public.applications.source is
  'open = النموذج المفتوح بثلاث رغبات · direct = رابطٌ مباشر لجهةٍ واحدة (choice2 و choice3 فارغتان)';