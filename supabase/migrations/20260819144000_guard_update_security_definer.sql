-- ⚠️ **إصلاحُ عطبٍ أحدثتْه هجرةُ `stage_ladder` وضرب الإنتاج مباشرةً.**
--
-- المحفِّزُ `guard_application_update` كُتب بلا `security definer`، فيعمل
-- بصلاحية **المستدعي**. ومفتاحُ الخدمة (`service_role`) لا يملك `usage`
-- على مخطَّط `private` — منحتْه هجرةُ التحصين لـ`authenticated` وحده، لأن
-- مفتاح الخدمة يتجاوز RLS أصلًا فلا يحتاج دوالَّها.
--
-- **والمحفِّزُ لا يتجاوزه شيء.** فكلُّ تحديثٍ يمرّ بمفتاح الخدمة سقط بـ
-- `permission denied for schema private` — وهي مسارات:
--
--   · ربطُ السيرة الذاتية بعد رفعها       (`markCvUploaded`)
--   · ربطُ ملفّ المشاريع بعد رفعه
--   · ختمُ `receipt_mailed_at` بعد الإيصال
--
-- ⛔ **والأثرُ صامتٌ على الطالب:** الطلبُ يُحفظ ويُقال له «وصل»، والملفُّ
-- يُرفع إلى التخزين فعلًا — ثم لا يُربط بصفّه. فيصل القائدَ طلبٌ «بلا سيرة
-- ذاتية» وصاحبُه أرفقها. وهو صنفُ العطل الذي حُذّر منه مرارًا في هذا
-- المستودع: **فشلٌ لا يصرخ.**
--
-- وقع على طلبين بين ١٦:٢٧ و١٧:٣٣ بتوقيت الرياض في ١٩ أغسطس، ورُبط ملفّاهما
-- يدويًّا بعد الإصلاح (الملفّان كانا سليمين في التخزين، والناقصُ المسار).
--
-- ── لماذا `security definer` لا منحُ المخطَّط لمفتاح الخدمة ──────────────
-- منحُ `usage on schema private to service_role` يحلّها أيضًا، لكنه يوسّع
-- سطحَ مفتاحٍ يتجاوز كلَّ شيء أصلًا — وهو الاتجاه الخاطئ. و`definer` يجعل
-- المحفِّزَ يعمل بصلاحية مالكه (الذي يملك المخطَّط)، فلا يُمنح أحدٌ شيئًا.
--
-- ⚠️ **ولا يُضعف الحراسة:** المنطقُ يقرأ هويّةَ المستدعي من الرمز
-- (`auth.jwt()` لا تتأثّر بـ`definer`)، ويقارن الصفَّ القديم بالجديد. فمن
-- كان قائدًا يبقى قائدًا في نظر الدالّة، ويبقى ممنوعًا من تغيير غير
-- الحالة.

create or replace function public.guard_application_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  probe public.applications;
begin
  if private.current_staff_role() = 'admin' then
    return new;
  end if;

  -- الدورُ الفارغ = مفتاحُ الخدمة، ويمرّ (ربطُ الملفّات وختمُ الإيصال)
  if private.current_staff_role() is null then
    return new;
  end if;

  -- السلّمُ وحدَه يُصرَّح له بتحريك `stage`، ويرفع رايتَه في `pass_over`
  if coalesce(current_setting('app.ladder', true), '') = 'on' then
    return new;
  end if;

  probe := old;
  probe.status := new.status;
  probe.decision_mailed_at := new.decision_mailed_at;
  if probe is distinct from new then
    raise exception 'لا يُغيَّر من اللوحة إلّا الحالة'
      using errcode = '42501';
  end if;
  return new;
end;
$$;
