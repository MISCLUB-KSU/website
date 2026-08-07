import Link from "next/link";

import { ALUMNI } from "@/content/people";
import { isolateLatin } from "@/lib/bidi";

/**
 * خريجونا — من مرّ بالنادي وتخرّج.
 *
 * ⚠️ **يحذف نفسه ما دامت `ALUMNI` فارغة.** القائمة فارغةٌ **عمدًا**: نشر
 * أسماء الأشخاص يحتاج قرارًا من الرئاسة **وموافقة كل شخص** — انظر رأس
 * `content/people.ts`. فلا عنوانَ معلّقٌ على فراغ، ولا اسمٌ «مؤقّت».
 *
 * **«خريجونا» لا «خريجينا»:** جمع مذكّر سالم (`خريجون`) مضافٌ إلى `نا`،
 * والعنوان القائم بذاته مرفوع. و«خريجينا» تصحّ منصوبةً أو مجرورةً داخل
 * جملة — «نفخر بخريجينا» — لا عنوانًا وحده.
 *
 * ── ما الذي «يليق بهم» ─────────────────────────────────────────────────
 *
 * ١) **الاسم هو البطل، لا الشركة.** الترتيب: دفعتُه فوق صغيرةً، ثم اسمه
 *    كبيرًا، ثم موقعه اليوم. عكسُه (الشركة أوّلًا) يجعل الخرّيج شاهدًا على
 *    جهةٍ أخرى لا صاحبَ القسم.
 * ٢) **كلمتُه بصوته** إن وُجدت — سطرٌ واحد يكتبه هو، لا وصفٌ يُكتب عنه.
 *    وهي ما يفرّق قسمًا يليق بهم عن رقيمة أسماء.
 * ٣) **بلا علامات اقتباسٍ ضخمة ولا صورةٍ دائرية**: «بطاقة الشهادة» بعلامة
 *    اقتباسٍ في رأسها وصورةٍ دائرية تحتها قالبٌ جاهزٌ يُعرف من نظرة،
 *    ويحوّل الخرّيج إلى شهادةِ عميلٍ على منتج. والصورة إذنٌ ثانٍ غير إذن
 *    الاسم.
 * ٤) **بلا ترتيبٍ يُقرأ تفضيلًا**: بلا أرقام ولا «الأبرز» — ترتيب الورود
 *    في `ALUMNI` وحده، وهو ترتيبُ إدخالٍ لا ترتيبُ قيمة.
 *
 * ── اللغة البصرية ──────────────────────────────────────────────────────
 *
 * بطاقاتٌ مدوّرة (`rounded-3xl`) بحدٍّ خافت على سطح الصفحة — لغةُ قسم الأسئلة فوقه
 * نفسها، فيُقرأ القسمان عائلةً واحدة. وعلى **سطح الصفحة** لا لوحٍ غائر:
 * الأسئلة فوقه على لوحٍ غائر، ولوحان متلاصقان يصيران شريطًا واحدًا.
 *
 * ⚠️ الألوان **رموزُ أسطح** تنقلب مع المظهر — لا رقمَ مثبَّتٌ بيد.
 */

export function Alumni() {
  if (ALUMNI.length === 0) return null;

  return (
    /* `above-mark` تلزم: القسم على مسار أضلاع الشعار الطائرة إلى التذييل،
       فبدونها تُرسم فوق النصّ. */
    <section
      id="alumni"
      aria-labelledby="alumni-heading"
      className="above-mark w-full py-s9"
    >
      <div className="mx-auto w-full max-w-6xl px-s4 sm:px-s7">
        <h2
          id="alumni-heading"
          className="text-balance text-center font-display text-3xl font-bold text-fg sm:text-4xl"
        >
          خريجونا
        </h2>
        <p className="mx-auto mt-s4 max-w-measure text-center text-base text-fg-muted sm:text-lg">
          مرّوا بالنادي، وهذا أين هم اليوم.
        </p>

        {/* الشبكة الأمّ تعرّف ثلاثة صفوف (الترويسة · الكلمة · الرابط)،
            وترثها البطاقة بـ`subgrid` — فتتحاذى الأسماء والكلمات والروابط
            عبر البطاقات مهما اختلفت أطوالها. بلا هذا تبدأ كلمةُ كلِّ خرّيج
            على ارتفاعٍ مختلف وتتراوح الشبكة. */}
        <ul className="mt-s7 grid gap-s5 md:grid-cols-2 md:grid-rows-[auto_1fr_auto] lg:grid-cols-3">
          {ALUMNI.map((person) => (
            <li
              key={person.name}
              className="grid content-start gap-s4 rounded-3xl border border-border-quiet bg-bg-raised p-s6 md:row-span-3 md:grid-rows-subgrid"
            >
              <div>
                {person.cohort ? (
                  /* ⚠️ `isolateLatin`: الدفعة رقمٌ لاتيني («دفعة 2024») وسط
                     نصٍّ عربي — بلا عزلٍ ينقلب ترتيبه. */
                  <p className="font-display text-xs font-semibold tracking-[0.12em] text-fg-muted">
                    {isolateLatin(person.cohort)}
                  </p>
                ) : null}
                <p className="mt-s2 font-display text-xl font-bold text-fg">
                  {isolateLatin(person.name)}
                </p>
                <p className="mt-s1 text-sm text-fg-muted sm:text-base">
                  {isolateLatin(person.role)}
                </p>
              </div>

              {/* كلمتُه بصوته — بلا علامة اقتباسٍ مرسومة: الزخرفة تُقرأ
                  «شهادة عميل».
                  ⚠️ B4: كان `border-s-2 border-accent` — حدٌّ من جهةٍ واحدة
                  وهو ممنوع، فحلّ محلّه **سطحٌ غائر بلا حدٍّ أصلًا** («الحدود
                  تدور حول الشكل كلّه أو لا تكون»). واستدارته `rounded-2xl`
                  (16px) من سلّم Tailwind؛ وصيغةُ التداخل لا تنطبق لأن الفجوة
                  عن البطاقة `p-s6` = 32px وليست دون الـ32. */}
              {person.quote ? (
                <p className="rounded-2xl bg-bg-sunken p-s4 text-pretty text-sm leading-relaxed text-fg sm:text-base">
                  {isolateLatin(person.quote)}
                </p>
              ) : (
                /* تُحجز الخانة ولا تُطوى: بطاقةٌ بلا كلمةٍ تقصر عن أخواتها
                   فينكسر انتظام الشبكة. */
                <span aria-hidden />
              )}

              {person.linkedin ? (
                <Link
                  href={person.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center self-start text-sm font-semibold text-accent transition-[color,transform] hover:text-accent-hover active:scale-[0.98] motion-reduce:active:scale-100"
                >
                  لينكدإن
                </Link>
              ) : (
                <span aria-hidden />
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
