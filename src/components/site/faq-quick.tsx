import Link from "next/link";

import { Mark } from "@/components/site/mark";
import type { FaqItem } from "@/content/faq";
import { isolateLatin } from "@/lib/bidi";

/**
 * الأسئلة الشائعة على الرئيسية — **الشكل من لقطة حسام، والألوان من الوضع**.
 *
 * ⚠️⚠️ **قاعدة هذا الملف: لا يُحسَّن المرجع، يُنفَّذ.**
 *
 * سبقت محاولاتٌ رُفضت كلّها لسببٍ واحد: كنت أعدّل ما يُرسله حسام بحجّتي
 * أنا — حشوتُ الأجوبة داخل الصفوف فذهبت الرشاقة، وحذفتُ السهم، وبدّلتُ
 * اللون مرّتين. **الاعتراض يُقال قولًا قبل البناء، لا يُدسّ تعديلًا في
 * الكود.**
 *
 * ── الشكل: منقولٌ عن اللقطة ────────────────────────────────────────────
 *
 * صفوفٌ بعرض اللوح شديدةُ الاستدارة · **مطويّةٌ** يفتحها الضغط ·
 * السؤال في طرف السطر البادئ وسهمٌ في طرفه التالي يدور عند الفتح ·
 * عنوانٌ عريضٌ موسّطٌ وسطرٌ خافتٌ تحته · فراغٌ سخيٌّ بين الصفوف، وهو مصدر
 * الرشاقة فلا يُضيَّق.
 *
 * ── اللون: من رموز الوضع لا مثبَّتًا ───────────────────────────────────
 *
 * ⚠️ كانت الألوان **مثبَّتةً بأرقامٍ من اللقطة** (لوحٌ كحليٌّ داكن جدًّا)،
 * فبقي القسم أسودَ في وضع النهار وسط صفحةٍ فاتحة. الحكم: «ليش خلفية سوداء
 * وحنا في وضع الـ light mode؟ … خلّ الخلفية متناسقة» (حسام، ٧ أغسطس ٢٠٢٦).
 *
 * فالألوان الآن **رموزُ أسطحٍ** تنقلب مع المظهر، وتحفظ علاقةَ اللقطة نفسها
 * في الوضعين: لوحٌ غائرٌ عن الصفحة، وصفوفٌ مرتفعةٌ عنه بحدٍّ خافت.
 *
 * | الدور | الرمز | نهارًا | ليلًا |
 * |---|---|---|---|
 * | اللوح | `bg-bg-sunken` | فاتحٌ مائل للرمادي | داكن |
 * | الصفّ | `bg-bg-raised` | أبيض | مرتفعٌ داكن |
 * | السهم والزرّ | `accent` | أزرق داكن | سماويّ |
 *
 * ── الفرق الوحيد عن اللقطة، وهو تقنيٌّ لا تصميميّ ──────────────────────
 *
 * الطيّ بعنصر `<details>` **أصيل** لا بجافاسكربت. الشكل هو الشكل، وتُكسَب
 * ثلاثٌ بلا ثمن: يعمل بلا جافاسكربت · يفتحه المتصفّح تلقائيًّا حين يجد
 * الجواب ببحث الصفحة (`Ctrl+F`) · ويُعلن حالته لقارئ الشاشة بلا `aria` يدوي.
 */

/** أربعة أسئلة كما في اللقطة — والبقيّة خلف رابط الصفحة الكاملة. */
const HOME_COUNT = 4;

type Props = {
  items: readonly FaqItem[];
};

export function FaqQuick({ items }: Props) {
  const shown = items.slice(0, HOME_COUNT);
  if (shown.length === 0) return null;

  return (
    /* `above-mark` تلزم: القسم على مسار أضلاع الشعار الطائرة بين مرسى
       «شركاء النجاح» وتجميعها في التذييل، فبدونها تُرسم فوق النصّ. */
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="above-mark w-full bg-bg-sunken py-s9"
    >
      <div className="mx-auto w-full max-w-4xl px-s4 sm:px-s7">
        {/* ═══ مرسى اجتماع العلامة ═══
            هنا تجتمع أضلاع الشعار الستّة بعد رحلتها على الأقسام. كان
            الاجتماع في التذييل، ونُقل إلى هنا بطلبٍ صريح (حسام، ٧ أغسطس
            ٢٠٢٦): «اللوقو ما يتشكّل عند الأسئلة الشائعة، أبيه يكون عندها،
            واللي تحت بالفوتر شِله».

            ⚠️ **بلا حشوٍ خاصٍّ بها.** `getBoundingClientRect` يشمل الحشو
            دائمًا، بينما الشعار الساكن بداخلها يملأ صندوق المحتوى وحده —
            فحشوٌ هنا يكبّر `kRest` عن حجم الشعار المرسوم فعليًّا وينحرف
            الانطباق. الحشو على الغلاف الخارجي لا عليها.

            ⚠️ `data-mark-static` على الغلاف لا على `Mark` — فهو لا ينشر
            الخصائص إلى `<svg>`. */}
        <div aria-hidden className="mx-auto mb-s7 w-full max-w-xl">
          <div
            data-mark-anchor="rest"
            className="w-full"
            style={{ aspectRatio: "2701 / 1016" }}
          >
            <div data-mark-static="" className="h-full w-full">
              <Mark decorative className="h-full w-full text-mark-quiet" />
            </div>
          </div>
        </div>

        <h2
          id="faq-heading"
          className="text-balance text-center font-display text-3xl font-bold text-fg sm:text-4xl"
        >
          الأسئلة الشائعة
        </h2>
        <p className="mx-auto mt-s4 max-w-measure text-center text-base text-fg-muted sm:text-lg">
          إجابات على استفساراتكم المتكررة
        </p>

        {/* الفراغ بين الصفوف سخيٌّ كما في اللقطة — هو ما يجعلها رشيقة. */}
        <div className="mt-s8 grid gap-s5">
          {shown.map((item) => (
            <details
              key={item.question}
              className="group overflow-hidden rounded-3xl border border-border-quiet bg-bg-raised"
            >
              {/* `list-none` و`::-webkit-details-marker` يخفيان المثلّث
                  الافتراضي، فيبقى السهم المرسوم وحده. */}
              <summary className="flex min-h-[76px] cursor-pointer list-none items-center justify-between gap-s4 px-s6 py-s5 text-start font-display text-base font-bold text-fg [&::-webkit-details-marker]:hidden sm:text-lg">
                {isolateLatin(item.question)}
                {/* السهم في طرف السطر التالي (اليسار في RTL) كما في اللقطة.
                    يدور ٩٠° عند الفتح فيشير إلى الأسفل — الحالة تُقرأ من
                    الشكل لا من الوسم وحده. `transform` وحده، ومعطَّلٌ لمن
                    طلب تقليل الحركة. */}
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  className="size-5 shrink-0 text-accent transition-transform duration-200 group-open:-rotate-90 motion-reduce:transition-none"
                >
                  <path
                    d="M15 5l-7 7 7 7"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </summary>

              <div className="grid gap-s3 border-t border-border-quiet px-s6 py-s5">
                {/* ⚠️ `isolateLatin` لازمة: الأجوبة تحوي «LinkedIn» و«MISthon»
                    وسط جملٍ عربية — بلا عزلٍ ينقلب ترتيبها. */}
                {item.answer.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-sm leading-relaxed text-fg-muted sm:text-base"
                  >
                    {isolateLatin(paragraph)}
                  </p>
                ))}
                {item.link ? (
                  <Link
                    href={item.link.href}
                    className="mt-s1 inline-flex min-h-11 items-center self-start text-sm font-semibold text-accent transition-[color,transform] hover:text-accent-hover active:scale-[0.98] motion-reduce:active:scale-100"
                  >
                    {item.link.label}
                  </Link>
                ) : null}
              </div>
            </details>
          ))}
        </div>

        <div className="mt-s8 text-center">
          {/* مدوّرٌ بالكامل لا مقصوص الركن — كما في اللقطة، وهو نقيض
              `.rake rake-sm` المستعمل في بقيّة أزرار الموقع. */}
          <Link
            href="/faq"
            className="inline-flex min-h-11 items-center rounded-full bg-accent px-s6 text-sm font-semibold text-accent-fg transition-[background-color,transform] hover:bg-accent-hover active:scale-[0.98] motion-reduce:active:scale-100"
          >
            كل الأسئلة الشائعة
          </Link>
        </div>
      </div>
    </section>
  );
}
