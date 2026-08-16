"use client";

import { MotionConfig, motion } from "motion/react";

import { Mark } from "@/components/site/mark";
import { findPreference } from "@/content/preferences";
import { isolateLatin } from "@/lib/bidi";
import {
  HOME_UNIVERSITY,
  MAJOR_OTHER,
  UNIVERSITY_OTHER,
} from "@/lib/registration";

/**
 * **توقيع الصفحة** — طلبُ العضوية يُبنى بينما يكتب الطالب.
 *
 * الفكرة: النموذج يسأل، والبطاقة **تُري ما صار**. كل حقلٍ يكتمل يظهر سطرُه
 * هنا، والرغبات الثلاث تترتّب، والحافّة تمتلئ بقدر ما أنجز. فيتحوّل الملء
 * من واجبٍ طويل إلى شيءٍ يُرى وهو يتكوّن.
 *
 * وهي **شارةُ عضويةٍ مرسومة** لا لوحُ ملخّص (١٦ أغسطس ٢٠٢٦، بطلب الإدارة):
 * حدٌّ فحميّ، وحافّةٌ تلقط الضوء، وظلٌّ يرفعها عن الصفحة، وخرمُ شريطةٍ
 * أعلاها. مادّةُ ذلك كلِّه في `globals.css` عند `.mis-badge` — وهناك أيضًا
 * لماذا هي **الاستثناء الوحيد** لقاعدة «بلا ظلال ولا حواف مجسّمة».
 *
 * ولماذا هذا لا يُنسخ إلى موقعٍ آخر: العلامةُ علامةُ النادي، والقطعُ قطعُ
 * الهوية بزاوية الشعار، والمحتوى **بيانات الطالب نفسه** لا صورةُ منتجٍ
 * متخيَّلة.
 *
 * ── ثلاثة قيودٍ حكمت البناء ─────────────────────────────────────────────
 *
 * ⚠️ **مرآةٌ لا مصدر.** لا معلومة هنا إلّا وأصلُها حقلٌ ظاهر. فبلا جافاسكربت
 * تغيب البطاقة كلُّها ولا يفقد الطالب شيئًا — ولذلك تحمل `js-only`.
 *
 * ⚠️ **الحركةُ في `y` وحده، والشفافية تبقى 1.** لو بُنيت على `opacity: 0`
 * ثم كُشفت، لكفى أن تتعثّر الحركة مرّةً ليبقى السطر موجودًا في الشجرة
 * غيرَ مرئيّ — وهو أسوأ من ألّا يكون. والسطر لا يُرسم أصلًا قبل أن تُكتب
 * قيمته، فالحركة تُدخل شيئًا جديدًا لا تكشف مخبوءًا.
 *
 * ⚠️ **القصُّ يُخلى له.** الحشوةُ البادئة (`p-s6` = 32px) تتجاوز ما يقتطعه
 * القطعُ أفقيًّا (`--cut-run` = 9.8px عند `rake-sm`)، فلا يُشطب حرفٌ عند
 * الحافّة — وهي القاعدة المنصوصة في `brand/v2/BRIEF.md`.
 *
 * ⚠️ **والظلُّ لا يكلّف شيئًا على الجوّال — مقيسٌ لا مفترَض.** البطاقة تُعاد
 * مع كل حرفٍ يكتبه الطالب، و`filter` يُخرج العنصر إلى طبقةٍ خاصّة، فالخوفُ
 * مشروع. قِيس على 390px بخنق معالجٍ ×4، ثلاثُ جولاتٍ لكلّ حالة، بـCDP لا
 * بحلقة `rAF`: **30.7ms/حرف بالظلّ و30.7 بلا ظلّ** — فرقٌ صفر، والتشتّت
 * بين الجولات (29.2–33.9) أكبرُ من الأثر أصلًا.
 */

type Values = Record<string, string>;

const RANKS = ["الرغبة الأولى", "الرغبة الثانية", "الرغبة الثالثة"] as const;

/** سطرٌ يظهر حين تُكتب قيمته — وقبلها لا وجود له */
function Line({
  label,
  value,
  delay = 0,
}: {
  label: string;
  value: string;
  delay?: number;
}) {
  if (!value) return null;
  return (
    <motion.div
      initial={{ y: 6 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.28, ease: [0.2, 0, 0, 1], delay }}
      className="flex flex-col gap-0.5"
    >
      <span className="text-on-ink-quiet text-[0.66rem] tracking-wide">
        {label}
      </span>
      <span className="text-on-ink text-[0.92rem] leading-snug font-medium">
        {isolateLatin(value)}
      </span>
    </motion.div>
  );
}

/**
 * ما يُعرض في خانة الجامعة والتخصّص: المكتوبُ يدويًّا يغلب «أخرى».
 * الطالب كتب اسم جامعته، فعرضُ كلمة «جامعة أخرى» عليه يُريه أن ما كتبه ضاع.
 */
function resolveOther(picked: string, other: string, sentinel: string): string {
  return picked === sentinel ? other.trim() : picked;
}

type RequestCardProps = {
  values: Values;
  choices: readonly string[];
  /** كم خطوةً أُنجزت — تملأ الحافّة، ولا تُخترع: مصدرها الخطوة الحالية */
  progress: number;
};

export function RequestCard({ values, choices, progress }: RequestCardProps) {
  const name = (values.fullName ?? "").trim();
  const university = resolveOther(
    values.university ?? "",
    values.universityOther ?? "",
    UNIVERSITY_OTHER,
  );
  const major = resolveOther(
    values.major ?? "",
    values.majorOther ?? "",
    MAJOR_OTHER,
  );
  const level = (values.level ?? "").trim();
  const picked = choices.filter(Boolean);

  /* الرقم الجامعي يُعرض لأنه **ما يعرّف الطالب عند اللجنة**، والهويةُ
     والجوالُ والبريد لا تُعرض: بياناتُ تواصلٍ لا تزيد الطالبَ يقينًا برؤيتها
     على بطاقة، وعرضُها يجعل الشاشة ورقةً تُصوَّر بما لا يُراد تصويره. */
  const studentId = (values.studentId ?? "").trim();

  return (
    <MotionConfig reducedMotion="user">
      {/* ⚠️ **الركنُ المقطوع كان مكتوبًا ولم يكن مرسومًا.** كان هنا
          `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 2.75rem)` وفوقه تعليقٌ
          يقول «الزاوية مقصوصةٌ بـclip-path». والنقطةُ الخامسة تقع على
          الضلع نفسِه (x=0 مثل جارتَيها) فلا تقتطع شيئًا — المضلَّعُ
          مستطيلٌ حرفيًّا. مفحوصٌ بلقطةٍ مكبَّرة للركن: زاويةٌ قائمةٌ تمامًا.
          فذهبت الحيلةُ المحلّية إلى `.rake` — قطعُ الهوية الوحيد، زاويتُه
          مشتقّةٌ من الشعار (٢٤°) لا مكتوبة، ويقصّ **الركن البادئ العلويّ**
          (اليمين في RTL) كما ينصّ `brand/v2/BRIEF.md`.

          و`rake-sm` لا المقاس الكامل: هبوطُ ٤٠px على بطاقةٍ عرضُها ٢٨٦
          يبتلع ربعَ الضلع، و٢٢px تُقرأ قطعًا لا كسرًا.

          والطبقاتُ الأربع وتعليلُها الكامل في `globals.css` عند
          `.mis-badge` — ومنها لماذا لا يصلح `border` هنا. */}
      <div className="mis-badge">
        <div className="mis-badge-ring rake rake-sm">
          <div className="mis-badge-edge rake rake-sm">
            <div className="mis-badge-bevel rake rake-sm">
              <aside
                aria-label="ملخّص طلبك"
                className="mis-badge-face rake rake-sm relative flex flex-col gap-s5 overflow-hidden p-s6 pt-s7"
              >
                {/* فتحةُ الشريطة — ما يجعلها تُقرأ شارةً تُعلَّق لا مستطيلًا ملوّنًا.
              مادّتُها في `globals.css`، وهي `aria-hidden` لأنها رسمُ ثقبٍ
              لا معلومة. */}
                <span aria-hidden className="mis-badge-slot" />

                {/* الحافّة تمتلئ بقدر ما أُنجز — أطرافٌ قائمةٌ لا مستديرة، فلا تنقلب
            عند التحوّل. والمقياس من الأعلى فينزل الملء مع تقدّم القراءة.

            ⚠️ **على ضلع النهاية — والقاعدةُ انقلبت مع القطع الحقيقيّ.** كانت
            على ضلع البداية بحجّة أن «القصَّ يأكل أعلى الضلع المقابل»، وذلك
            صحيحٌ لقصٍّ عند x=0. أمّا قطعُ الهوية فيأكل الركن **البادئ**
            (اليمين في RTL) — فبقاؤها هناك يبدأها مقطوعةَ الرأس. وضلعُ
            النهاية سليمٌ من القطع، فانتقلت إليه. */}
                <motion.i
                  aria-hidden
                  className="bg-on-ink-quiet absolute inset-y-0 end-0 block w-[3px] origin-top"
                  initial={false}
                  animate={{ scaleY: progress }}
                  transition={{ duration: 0.45, ease: [0.2, 0, 0, 1] }}
                />

                <header className="flex items-center gap-s3">
                  <Mark className="text-on-ink h-5 w-auto" decorative />
                  <span className="text-on-ink-quiet text-[0.7rem] font-semibold tracking-[0.18em]">
                    طلب عضوية
                  </span>
                </header>

                {/* الاسمُ بطلُ البطاقة. وقبل أن يُكتب يبقى مكانُه خطًّا لا نصًّا:
            نصٌّ مثل «اسمك هنا» يُقرأ محتوًى فيربك، والخطّ يُقرأ فراغًا مُعدًّا. */}
                <div>
                  {name ? (
                    <motion.p
                      initial={{ y: 8 }}
                      animate={{ y: 0 }}
                      transition={{ duration: 0.32, ease: [0.2, 0, 0, 1] }}
                      className="font-display text-on-ink text-xl leading-tight font-bold"
                    >
                      {name}
                    </motion.p>
                  ) : (
                    <span
                      aria-hidden
                      className="bg-on-ink-quiet/35 block h-px w-24"
                    />
                  )}
                </div>

                {(university || level || major || studentId) && (
                  <div className="grid grid-cols-2 gap-s4">
                    <Line label="الجامعة" value={university} />
                    <Line
                      label="الرقم الجامعي"
                      value={studentId}
                      delay={0.04}
                    />
                    <Line label="المستوى" value={level} delay={0.08} />
                    <Line label="التخصص" value={major} delay={0.12} />
                  </div>
                )}

                {picked.length > 0 && (
                  /* ⚠️ `min-w-0`: قِيس عند تكبير النصّ 200% أن بطاقة الطلب تُخرج
               الصفحة إلى **415px** في 375 (مخالفة WCAG 1.4.4). ومصدرُها هذي
               الكتلة: `min-width: auto` يمنعها من النزول تحت عرض محتواها
               الأدنى، وعمودُ الرتبة `w-14 shrink-0` يتضاعف معها إلى 112px. */
                  <div className="border-on-ink-quiet/25 flex min-w-0 flex-col gap-s3 border-t pt-s4">
                    {choices.map((choice, index) =>
                      choice ? (
                        <motion.div
                          key={choice}
                          initial={{ y: 8 }}
                          animate={{ y: 0 }}
                          transition={{
                            duration: 0.28,
                            ease: [0.2, 0, 0, 1],
                            delay: index * 0.05,
                          }}
                          className="flex min-w-0 items-baseline gap-s3"
                        >
                          <span className="text-on-ink-quiet w-14 shrink-0 text-[0.66rem]">
                            {RANKS[index]}
                          </span>
                          <span className="text-on-ink min-w-0 text-[0.88rem] leading-snug [overflow-wrap:anywhere]">
                            {isolateLatin(
                              findPreference(choice)?.fullLabel ?? choice,
                            )}
                          </span>
                        </motion.div>
                      ) : null,
                    )}
                  </div>
                )}

                <p className="text-on-ink-quiet mt-auto text-[0.68rem] leading-relaxed">
                  {university === HOME_UNIVERSITY
                    ? "نادي نظم المعلومات الإدارية · جامعة الملك سعود"
                    : "نادي نظم المعلومات الإدارية"}
                </p>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}
