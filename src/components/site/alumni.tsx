import { ALUMNI, type Alumnus } from "@/content/alumni";
import { isolateLatin } from "@/lib/bidi";

/**
 * «مبدعون مرّوا من هنا» — بين «شركاء النجاح» و«الأسئلة الشائعة».
 *
 * ⚠️ **العرض منقولٌ عن قسم «آراء الطلاب» في `hosamstudyhub.com`** بطلب
 * حسام: «خل المبدعون نفسها بالضبط». وهو جدارٌ ضبابيّ من البطاقات نفسها
 * خلف شريطٍ حادّ، وصفّان يجريان بسرعتين لا تقبل إحداهما القسمة على
 * الأخرى، وتلاشٍ على الحافّتين بدل أن ينتهي الشريط على خطّ.
 *
 * والبنية والحركة مستعارتان؛ أمّا الألوان والحوافّ فمن هذا الموقع.
 *
 * ── ما يُحفظ من قواعد هذا المستودع ──────────────────────────────────────
 * · **المحتوى ظاهرٌ افتراضيًّا**: البطاقات مرسومةٌ كاملةً، والحركة تحويلٌ
 *   فوق موجود. ولو لم تعمل الحركة بقي الشريط مقروءًا ويُمرَّر يدويًّا.
 * · **لا شيء يُرسم ما دامت القائمة فارغة** — لا عنوانَ بلا محتوى.
 * · **النسخة المكرّرة `aria-hidden`**: الشريط يُضاعَف ليدور بلا فجوة،
 *   ولولا الإخفاء لقرأ قارئُ الشاشة كل اسمٍ مرّتين.
 */

/* ⚠️ الصفّان يقتسمان القائمة **قسمةً لا تداخل فيها**: لو حمل كلٌّ منهما
   القائمة كاملةً لعاد الاسم نفسه في الصفّ الآخر بعد قليل — وجدارٌ وظيفته
   أن يبدو كثيرًا، تكرارُ الوجه فيه يجعله يبدو أقلّ. */
function halves(list: readonly Alumnus[]) {
  const mid = Math.ceil(list.length / 2);
  return [list.slice(0, mid), list.slice(mid)] as const;
}

export function Alumni() {
  if (ALUMNI.length === 0) return null;

  const [top, bottom] = halves(ALUMNI);
  /* المضاعفة هي ما يجعل الدوران بلا قفزة: الحركة تزيح ٥٠٪ فتحلّ النسخة
     الثانية محلّ الأولى تمامًا. */
  const doubled = (row: readonly Alumnus[]) => [...row, ...row];

  return (
    <section
      id="alumni"
      aria-labelledby="alumni-heading"
      className="above-mark w-full py-s8"
    >
      <div className="mx-auto w-full max-w-6xl px-s4 sm:px-s7">
        <div className="mb-s5 flex items-center justify-center gap-s3">
          <span aria-hidden className="inline-block h-5 w-[22.9px] shrink-0">
            <span className="mis-slant block h-full w-full bg-accent" />
          </span>
          <h2
            id="alumni-heading"
            className="font-display text-fg text-lg font-bold tracking-[0.14em] sm:text-xl"
          >
            مبدعون مرّوا من هنا
          </h2>
        </div>

        <p className="text-fg-muted mx-auto max-w-[54ch] text-center leading-relaxed">
          طلبةُ التخصّص الذين سلّط عليهم النادي الضوء في «MIS Spotlight» — وأين
          هم اليوم.
        </p>
      </div>

      {/* الشريط يمتدّ من حافّةٍ إلى حافّة والعنوان يبقى في الحاوية: شريطٌ
          يقف عند الهامش يُقرأ أداةً أُلقيت في الصفحة، وجُلُّ معنى الشريط
          أنه آتٍ من مكانٍ وذاهبٌ إلى مكان. */}
      <div className="alu-stage mt-s6">
        <div className="alu-wall" aria-hidden>
          {[0, 1, 2].map((row) => (
            <div className="alu-wall-row" key={row}>
              {Array.from({ length: 5 }, (_, col) => (
                <Card
                  key={col}
                  person={ALUMNI[(row * 5 + col) % ALUMNI.length]}
                  wall
                />
              ))}
            </div>
          ))}
        </div>

        <div className="alu-marquee">
          <div className="alu-track alu-track--fast">
            {doubled(top).map((person, i) => (
              <Card
                key={`t-${person.name}-${i}`}
                person={person}
                muted={i >= top.length}
              />
            ))}
          </div>
          <div className="alu-track alu-track--slow">
            {doubled(bottom).map((person, i) => (
              <Card
                key={`b-${person.name}-${i}`}
                person={person}
                muted={i >= bottom.length}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── البطاقة ─────────────────────────────────────────────────────────────
   الصورة أوّلًا ثم الاسم ثم ما هو عليه اليوم، ودورُه في النادي أسفلَ خطٍّ
   فاصل — فالانتقال هو ما يقنع لا الاسم وحده. */
function Card({
  person,
  wall,
  muted,
}: {
  person: Alumnus;
  wall?: boolean;
  muted?: boolean;
}) {
  return (
    <article
      aria-hidden={wall || muted || undefined}
      className={`bg-bg-raised border-line flex flex-col justify-center border p-s5 ${
        wall ? "alu-wall-card" : "w-[clamp(17rem,25vw,21rem)] shrink-0"
      }`}
    >
      <div className="flex items-center gap-x-s4">
        {/* ⚠️ الصورة **اختيارية ولا بديلَ مخترعًا لها**: من لا صفحةَ له في
            الكتيّب لا صورةَ له، والفراغ أصدق من حرفين في دائرةٍ متدرّجة. */}
        {person.photo && (
          <img
            src={person.photo}
            alt=""
            width={56}
            height={56}
            loading="lazy"
            className="size-14 shrink-0 rounded-full object-cover"
          />
        )}
        <div className="min-w-0">
          <p className="text-fg truncate text-[1rem] font-bold">
            {isolateLatin(person.name)}
          </p>
          {/* ⚠️ **لا `truncate` على المسمّى**: «رئيس المجلس الطلابي لنظم
              المعلومات الإدارية» يُبتر إلى «…الطلابي لن» فيفقد معناه.
              يلتفّ سطرين، والبطاقات تتمدّد لأطولها بـ`items-stretch`. */}
          <p className="text-accent text-[0.86rem] leading-snug font-semibold">
            {isolateLatin(person.roleNow)}
          </p>
          <p className="text-fg-muted text-[0.8rem] leading-snug">
            {isolateLatin(person.org)}
          </p>
        </div>
      </div>

      {person.roleThen && (
        <p className="border-line text-fg-muted mt-s4 border-t pt-s3 text-[0.8rem]">
          <span aria-hidden className="text-accent">
            ←{" "}
          </span>
          {isolateLatin(person.roleThen)}
        </p>
      )}
    </article>
  );
}
