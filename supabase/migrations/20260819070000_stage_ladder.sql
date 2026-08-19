-- سلّمُ الرغبات — **عند أيّ رغبةٍ ننظر في هذا المتقدّم الآن؟**
--
-- الحالةُ (`status`) تقول «وش قرّرنا»، ولا تقول «وين هو في السلّم». وكلُّ
-- خطّة الموسم تقوم على هذا الفرق: القائدُ يقابل من وضعه **أوّلًا**، ومن لم
-- يُقبل ينزل إلى رغبته التالية فينظر فيه قائدُها.
--
-- ⚠️ **وطريقٌ أبسطُ جُرّب وسقط:** استنتاجُ الرتبة من الحالة (`referred` =
-- عند الثانية) بلا عمودٍ جديد. يسقط لأن قائدَ المرحلة الثانية يفتح المُحال
-- ويضبطه «قيد المراجعة» — فتصير حالتُه `reviewing` التي تعني «عند الأولى»،
-- **فيختفي الشخصُ من الشاشتين معًا**: لا في طابور الأولى (نطاقٌ مختلف) ولا
-- في قائمة المُحالين (تغيّرت حالتُه). تُرقّيه فيضيع.
--
-- والوقتُ الآن أسلمُ ما يكون: ٢٤١ صفًّا كلُّها `new`، فلا صفَّ يحتاج ترحيلًا
-- و`default 1` صحيحةٌ لكلٍّ منها.

alter table public.applications
  add column stage smallint not null default 1
  check (stage between 1 and 3);

comment on column public.applications.stage is
  'رتبةُ الرغبة التي يُنظر فيه عندها الآن: ١ أولى · ٢ ثانية · ٣ ثالثة.';

-- الطابورُ يُقرأ دائمًا بـ(الرتبة، الحالة) — والفهرسُ يتبع القراءة
create index applications_stage_status_idx
  on public.applications (stage, status);

-- ── بوّابةُ المرحلة ─────────────────────────────────────────────────────
-- ⚠️ **شيءٌ ثانٍ غيرُ `stage`، ولا يُغني أحدُهما عن الآخر.** `stage` تقول
-- أين الشخص؛ و`phase` تقول متى **يُسمح** بالعمل على من نزل.
--
-- بدونها: قائدٌ ينهي شغله بسرعة ويمرّر عشرين، فيهبطون فورًا إلى قادة
-- رغبتهم الثانية — فيملأ أولئك نصيبَهم من الدفعة المبكّرة قبل أن يروا
-- بقيّة المجموعة. وهو الظلمُ نفسُه الذي وُجد السلّمُ ليمنعه.

create table public.settings (
  -- ⚠️ صفٌّ واحدٌ لا غير: المفتاحُ منطقيٌّ مقيَّدٌ بـ`true`، فثانٍ مستحيل
  id         boolean primary key default true check (id),
  phase      smallint not null default 1 check (phase between 1 and 3),
  updated_at timestamptz not null default now()
);

insert into public.settings default values;

comment on table public.settings is
  'إعداداتُ الموسم — صفٌّ واحد. `phase` أعلى رتبةٍ يُسمح بالعمل عليها.';

alter table public.settings enable row level security;

create policy "الطاقم يقرأ الإعدادات"
  on public.settings for select to authenticated
  using (private.current_staff_role() in ('admin', 'leader'));

-- ⛔ الرئاسةُ وحدها تفتح مرحلةً — وهو قرارُ موسمٍ لا تصرّفُ قائد
create policy "الرئاسة تضبط الإعدادات"
  on public.settings for update to authenticated
  using (private.current_staff_role() = 'admin')
  with check (private.current_staff_role() = 'admin');

create or replace function private.current_phase()
returns smallint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select s.phase from public.settings s limit 1), 1::smallint)
$$;

revoke all     on function private.current_phase() from public, anon;
grant  execute on function private.current_phase() to authenticated;

-- ── حارسُ التحديث ───────────────────────────────────────────────────────
-- ⚠️ **ثغرةٌ قائمةٌ تُغلَق هنا.** `with check` كان `role in ('admin','leader')`
-- **بلا فحصِ نطاقٍ على الصفّ الجديد إطلاقًا** — فقائدٌ باستدعاءٍ مباشر يقدر
-- يغيّر `choice1` لطلبٍ فيحوّله إلى لجنته. والتعليقُ فوق السياسة كان يقول
-- «البيانات الشخصية لا تُمسّ»، والسياسةُ لا تفرضه.
--
-- ولا يكفي `with check` وحده: هو لا يرى الصفَّ القديم فلا يقدر يقول «هذا
-- الحقلُ تغيّر». فالحارسُ محفِّزٌ يرى الاثنين.
--
-- ⚠️ **والمقارنةُ بالصفّ كلِّه لا بعدّ الأعمدة يدويًّا.** عمودٌ يُضاف بعد
-- سنةٍ كان سيفلت من قائمةٍ مكتوبة؛ وهذي تحرسه يوم يُضاف بلا أن يتذكّره أحد.
create or replace function public.guard_application_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  probe public.applications;
begin
  if private.current_staff_role() = 'admin' then
    return new;
  end if;

  -- ⚠️ **الدورُ الفارغ = مفتاحُ الخدمة، ويمرّ.** شيفرةُ الخادم تختم
  -- `receipt_mailed_at` بعد إرسال إيصال التقديم، ولا رمزَ لها فلا بريد؛
  -- فحجزُها هنا كان سيُسقط ختمَ كلِّ إيصالٍ يخرج. ومن دخل ببريدٍ ليس في
  -- `staff` لا يبلغ هذا المحفِّز أصلًا: سياسةُ `using` تردّه قبله.
  if private.current_staff_role() is null then
    return new;
  end if;

  -- السلّمُ وحدَه يُصرَّح له بتحريك `stage`، ويرفع رايتَه في `pass_over`
  if coalesce(current_setting('app.ladder', true), '') = 'on' then
    return new;
  end if;

  probe := old;
  probe.status := new.status;
  -- ⚠️ **وختمُ بريد القرار معها.** الإرسالُ بالجملة يختم `decision_mailed_at`
  -- **بعميل الجلسة** لا بمفتاح الخدمة (وهو صواب: تقصّه RLS على نطاق
  -- المرسِل)، فحجزُه كان سيُسقط كلَّ دفعةٍ يرسلها قائد — والختمُ هو حارسُ
  -- التكرار، فسقوطُه يعني رفضًا يصل المتقدّمَ مرّتين وثلاثًا.
  probe.decision_mailed_at := new.decision_mailed_at;
  if probe is distinct from new then
    raise exception 'لا يُغيَّر من اللوحة إلّا الحالة'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger applications_guard_update
  before update on public.applications
  for each row execute function public.guard_application_update();

-- ── سياسةُ التحديث: الكتابةُ محكومةٌ بالمرحلة، والقراءةُ كما هي ──────────
-- ⚠️ **القراءةُ لا تُمسّ عمدًا.** القائدُ يبقى يرى كلَّ من ذكره في رغباته
-- الثلاث — وهو مصرَّحٌ له بذلك، والضررُ في **الفعل** لا في النظر. وقفلُ
-- القراءة كان يُخفي عنه من مرّره فورَ تمريره، فلا يبقى عنده سجلٌّ لمن
-- قابله. وهو أيضًا أخطرُ سياسةٍ تُلمس والموسمُ شغّال.

drop policy if exists "الطاقم يحدّث حالة ما في نطاقه" on public.applications;

create policy "الطاقم يحدّث حالة ما عند رتبته"
  on public.applications for update to authenticated
  using (
    private.current_staff_role() = 'admin'
    or (
      private.current_staff_role() = 'leader'
      -- الجهةُ التي يُنظر فيه عندها الآن — لا أيُّ رغبةٍ من الثلاث
      and private.choice_in_scopes(
            case stage
              when 1 then choice1
              when 2 then choice2
              else        choice3
            end,
            private.current_staff_scopes())
      -- ولا يُعمل على رتبةٍ لم تُفتح بعد
      and stage <= private.current_phase()
    )
  )
  with check (
    private.current_staff_role() = 'admin'
    or (
      private.current_staff_role() = 'leader'
      and private.choice_in_scopes(
            case stage
              when 1 then choice1
              when 2 then choice2
              else        choice3
            end,
            private.current_staff_scopes())
      and stage <= private.current_phase()
    )
  );

-- ── التمرير إلى الرغبة التالية ──────────────────────────────────────────
-- ⚠️ **دالّةٌ لا تحديثٌ عاديّ، ولا خيارَ في ذلك.** الصفُّ بعد `stage + 1`
-- يخرج من نطاق القائد، فشرطُ `with check` يردّ التحديثَ الذي أذِنّا به
-- للتوّ. فالتحقّقُ يقع **قبل** النقل، ثم يُنقل بصلاحية المالك.
--
-- ⚠️ **و`security definer` يتجاوز RLS، فالفحصُ أدناه ليس تجميلًا** — هو
-- الحارسُ الوحيد. حذفُه يجعل أيَّ قائدٍ يمرّر أيَّ متقدّمٍ في النادي.
--
-- ⚠️ **ومعنى الرفض انقلب.** «لا يناسب لجنتي» ≠ «لا يناسب النادي»: من له
-- رغبةٌ تالية يكملها، ومن لا رغبةَ بعدها يُعتذر عنه نهائيًّا. والمتقدّمُ
-- برابطٍ مباشر (`choice2` فارغة) يُعالَج بهذا الشرط نفسِه بلا حالةٍ خاصّة.
create or replace function public.pass_over(app_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  a          public.applications;
  nxt        smallint;
  nxt_choice text;
begin
  select * into a from public.applications where id = app_id;
  if not found then
    return 'missing';
  end if;

  if private.current_staff_role() = 'leader' then
    if not private.choice_in_scopes(
         case a.stage
           when 1 then a.choice1
           when 2 then a.choice2
           else        a.choice3
         end,
         private.current_staff_scopes())
    then
      return 'denied';
    end if;
    if a.stage > private.current_phase() then
      return 'denied';
    end if;
  elsif private.current_staff_role() is distinct from 'admin' then
    return 'denied';
  end if;

  -- قرارٌ نهائيٌّ لا يُنقض بتمرير
  if a.status in ('accepted', 'rejected') then
    return 'decided';
  end if;

  nxt := a.stage + 1;
  nxt_choice := case nxt
                  when 2 then a.choice2
                  when 3 then a.choice3
                  else        ''
                end;

  perform set_config('app.ladder', 'on', true);

  if nxt <= 3 and coalesce(btrim(nxt_choice), '') <> '' then
    -- الحالةُ تعود `new`: القائدُ التالي لم يرَه بعد
    update public.applications
       set stage = nxt, status = 'new'
     where id = app_id;
    perform set_config('app.ladder', 'off', true);
    return 'moved';
  end if;

  update public.applications set status = 'rejected' where id = app_id;
  perform set_config('app.ladder', 'off', true);
  return 'rejected';
end;
$$;

revoke all     on function public.pass_over(uuid) from public, anon;
grant  execute on function public.pass_over(uuid) to authenticated;
