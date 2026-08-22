/**
 * **قياسُ اكتمال الملفّ، وردُّ الأجوبة إلى أسئلتها.**
 *
 * ⚠️ **نُقلا من `applications-table.tsx` ليقرأهما الخادمُ أيضًا.** المسارُ
 * الحيُّ (`/feed.csv`) يخرج فيه عمودُ «نسبة التقييم» — وهو نفسُ الرقم
 * الظاهر في اللوحة. ونسخُ الحساب في موضعين يجعل الملفَّ يقول رقمًا
 * والشاشةُ تقول غيرَه على المتقدّم نفسِه.
 */

import { questionBlocks } from "@/content/preferences";
import { answerName, type QuestionType } from "@/content/questions";

import type { Row } from "./stats";

/* ── اكتمال الملفّ ──────────────────────────────────────────────────────
   ⚠️ **مقياسٌ معلَنُ البنود لا درجةٌ غامضة.** يُحسب على ما **ينطبق** فقط:
   من لم يُسأل سؤالًا لا يُخصم لعدم إجابته. والبنود تُعرض للمراجع نصًّا في
   بطاقةٍ مستقلّة حتى لا يكون الرقم صندوقًا أسود يُحكم به على متقدّم. */
export const WHY_ENOUGH = 120;

export type Item = {
  label: string;
  ok: boolean;
  weight: number;
  /**
   * نصيبُ البند من وزنه (٠..١) — لبندٍ يُنجَز على أجزاء.
   *
   * ⚠️ **وبلاها كان بندُ الأجوبة يساوي بين من ترك واحدًا ومن ترك الكلّ.**
   * كان `ok: requiredAsked.every(...)` — أي صفرًا من عشرين لمن أجاب ثلاثةً
   * من أربعة. ومقيسٌ من القاعدة (١٩ أغسطس ٢٠٢٦) أن **٩٩ من ٢٦١** تركوا
   * جوابًا واحدًا على الأقلّ فارغًا، فالحالةُ الوسطى هي الغالبة لا النادرة.
   */
  part?: number;
};

export function completeness(row: Row): { items: Item[]; pct: number } {
  const asked = askedQuestions(row);
  const items: Item[] = [
    { label: "سيرة ذاتية", ok: !!row.cv_path, weight: 30 },
    {
      label: `دافعٌ مفصَّل (${WHY_ENOUGH}+ حرفًا)`,
      ok: (row.why ?? "").trim().length >= WHY_ENOUGH,
      weight: 25,
    },
    { label: "معرض أعمال", ok: !!row.portfolio, weight: 15 },
    { label: "لينكدإن", ok: !!row.linkedin, weight: 10 },
  ];
  /* ⚠️ **المطلوبةُ وحدها تُحسب.** السؤال الاختياريُّ يُخزَّن بقيمةٍ فارغة
     لمن تركه، فحسبُ الجميع كان يهبط بدرجة كل من لم يملأ حقلًا لم يُطلب
     منه — وهو نقضُ قاعدة «من لم يُسأل لا يُخصم» المكتوبة أعلاه. */
  const requiredAsked = asked.filter((a) => a.required);
  if (requiredAsked.length > 0) {
    const done = requiredAsked.filter((a) => a.value.trim().length > 0).length;
    items.push({
      /* العددُ في الوسم: «٣ من ٤» تقول للقائد **ما الناقص** لا «لم يكتمل» */
      label: `أجوبة القادة (${done} من ${requiredAsked.length})`,
      ok: done === requiredAsked.length,
      part: done / requiredAsked.length,
      weight: 20,
    });
  }
  const max = items.reduce((a, b) => a + b.weight, 0);
  const got = items.reduce(
    (a, b) => a + b.weight * (b.part ?? (b.ok ? 1 : 0)),
    0,
  );
  return { items, pct: max ? Math.round((got / max) * 100) : 0 };
}

export type Asked = {
  key: string;
  /** الجهة التي سُئل عنها — رغبةٌ أو لجنةٌ تشترك فيها وحداتُها */
  title: string | null;
  label: string | null;
  type: QuestionType | null;
  required: boolean;
  value: string;
};

/**
 * ردُّ الإجابات إلى أسئلتها.
 *
 * ⚠️ لا يُشقّ المفتاح نصًّا — قيمة الرغبة نفسها تحمل `:` و`/`. بل يُبنى
 * بـ`answerName` لكل سؤالٍ في كتل الطالب ثم يُبحث عنه. وما بقي من مفاتيح
 * بلا سؤال يُعرض معلَّمًا لا يُسقط.
 *
 * ⚠️ **`questionBlocks` لا المرورُ على الرغبات الثلاث.** أسئلةُ اللجنة
 * تُخزَّن بمفتاح اللجنة لا بمفتاح الوحدة، فالمرورُ على الرغبات يبني
 * مفاتيحَ لا وجود لها في `answers` — فتسقط الأجوبةُ كلُّها إلى ذيل
 * «سؤالٌ لم يعد معرَّفًا».
 */
export function askedQuestions(row: Row): Asked[] {
  const answers = row.answers ?? {};
  const out: Asked[] = [];
  const seen = new Set<string>();

  for (const block of questionBlocks([row.choice1, row.choice2, row.choice3])) {
    for (const q of block.questions) {
      const key = answerName(block.key, q.id);
      if (seen.has(key) || !(key in answers)) continue;
      seen.add(key);
      out.push({
        key,
        title: block.title,
        label: q.label,
        type: q.type,
        required: !!q.required,
        value: answers[key],
      });
    }
  }
  for (const [key, value] of Object.entries(answers)) {
    if (seen.has(key)) continue;
    out.push({
      key,
      title: null,
      label: null,
      type: null,
      required: false,
      value,
    });
  }
  return out;
}
