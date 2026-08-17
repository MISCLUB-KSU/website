import "server-only";

import { SITE_URL } from "@/lib/site";
import type { Mail } from "./client";

/**
 * قوالب بريد النادي — عربيّةٌ `rtl`، وبتنسيقٍ داخليّ لا صفحةِ أنماط.
 *
 * ⚠️ **قواعد بريدٍ لا قواعد صفحة.** عملاء البريد (جيميل، أوتلوك) يُسقطون
 * `<style>` الخارجيّ وأكثرَ ما في CSS الحديث، فالتنسيق **داخل السمة**
 * والتخطيط بجداول. وما يصلح في الموقع لا يصلح هنا.
 *
 * ⚠️ **ولا خطوطَ ولا صورًا خارجية:** تحميلُها يُحجب افتراضًا في أكثر
 * العملاء، فالعلامة تُرسم بالنصّ والحدود لا بملفّ.
 */

/**
 * ترميزُ ما يكتبه الطالب قبل وضعه في HTML.
 *
 * ⚠️ **ترميزٌ لا تنقية.** `sanitizeHtml` في `lib/sanitize.ts` وُضع لمتنٍ
 * موثوقٍ يُسمح فيه ببعض الوسوم؛ وهذا اسمٌ كتبه مجهول ولا يُسمح فيه بوسمٍ
 * البتّة. واسمٌ فيه `<` يكسر البريد، وسكربتٌ فيه يصل بريدَ من يقرأ.
 */
/**
 * اسمُ جهةٍ داخل نصٍّ عربيّ — مرمَّزٌ ومعزولٌ اتجاهيًّا.
 *
 * ⚠️ **`<bdi>` لا `<span>`:** أسماءُ المشاريع لاتينية (`MISthon`, `Impact`)
 * وتقع داخل فقرةٍ `rtl`؛ وبلا عزلٍ تلتصق بها علامةُ الترقيم المجاورة فتقفز
 * إلى الجهة الخطأ. و`<bdi>` هو العنصر الموضوع لهذا، ومن لا يدعمه من عملاء
 * البريد يعامله كعنصرٍ سطريٍّ عاديّ — فلا يكسر شيئًا.
 */
function place(value: string): string {
  return `<bdi>${esc(value)}</bdi>`;
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CLUB = "نادي نظم المعلومات الإدارية";
const INK = "#14181f";
const MUTED = "#5b6472";
const LINE = "#e3e8ee";
const ACCENT = "#1f4e8c";

/** الغلاف المشترك — رأسٌ بالعلامة، ومتنٌ، وتذييلٌ فيه رابط الموقع */
function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f6f9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${LINE};border-radius:10px;overflow:hidden;font-family:'Segoe UI',Tahoma,Arial,sans-serif;">

<tr><td style="padding:22px 26px;border-bottom:1px solid ${LINE};">
  <span style="display:inline-block;background:${ACCENT};color:#ffffff;font-size:12px;font-weight:700;padding:6px 14px;border-radius:3px;transform:skewX(-12deg);">${CLUB}</span>
</td></tr>

<tr><td style="padding:26px;color:${INK};font-size:15px;line-height:1.9;text-align:right;">
${body}
</td></tr>

<tr><td style="padding:16px 26px;border-top:1px solid ${LINE};color:${MUTED};font-size:12px;line-height:1.8;text-align:right;">
  ${CLUB} — جامعة الملك سعود<br>
  <a href="${SITE_URL}" style="color:${ACCENT};text-decoration:none;" dir="ltr">${SITE_URL.replace(/^https?:\/\//, "")}</a>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`;
}

/** فقرةٌ بمقاسٍ موحّد */
const p = (text: string) => `<p style="margin:0 0 14px;">${text}</p>`;

/** صندوقُ تفصيلٍ جانبيّ — الرغبات ونحوها */
const box = (rows: string) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border-right:3px solid ${ACCENT};background:#f7f9fc;">
<tr><td style="padding:12px 14px;font-size:14px;line-height:1.9;color:${INK};">${rows}</td></tr></table>`;

export type ApplicantMail = {
  fullName: string;
  email: string;
  /** أسماء الرغبات كاملةً بترتيبها — الفارغة مُزالة قبل التمرير */
  choices: readonly string[];
};

/* ── ١ · وصل طلبك ──────────────────────────────────────────────────────── */

/**
 * تأكيدُ الوصول.
 *
 * ⚠️ **يقول ما يحدث لا ما يسرّ.** «سنراسلك خلال أسبوع» مكتوبةٌ في النموذج،
 * فتُكرَّر هنا بالنصّ نفسه — ووعدٌ يختلف بين الصفحة والبريد يُفقد الثقة.
 */
export function applicationReceived(a: ApplicantMail): Mail {
  const list = a.choices
    .map(
      (choice, i) =>
        `<div${i ? ' style="margin-top:6px;"' : ""}><span style="color:${MUTED};">${["الرغبة الأولى", "الرغبة الثانية", "الرغبة الثالثة"][i] ?? "رغبة"}:</span> <strong>${place(choice)}</strong></div>`,
    )
    .join("");

  const html = layout(
    "وصل طلبك",
    p(`مرحبًا ${esc(a.fullName)}،`) +
      p("<strong>وصل طلبك للعضوية</strong> واستلمناه.") +
      (a.choices.length ? box(list) : "") +
      p(
        /* ⚠️ **لا تُذكر قناةُ النتيجة هنا** (١٦ أغسطس ٢٠٢٦). كانت تقول
           «نرسل النتيجة على بريدك»؛ والقبولُ اليوم واتساب والرفضُ بريد، فأيُّ
           تسميةٍ للقناة تحوّل **وصولَ الرسالة** إلى إعلانٍ بالنتيجة قبل
           فتحها. والصيغةُ محايدةٌ عمدًا: «خلال أسبوعين عمل» ولا أكثر. */
        "نراجع الطلبات ونرسل النتيجة <strong>خلال أسبوعين عمل</strong>. لا حاجة لإعادة التقديم.",
      ) +
      p(
        `<span style="color:${MUTED};">إن لم يكن هذا الطلب منك، تجاهل هذي الرسالة.</span>`,
      ),
  );

  const text = [
    `مرحبًا ${a.fullName}،`,
    "",
    "وصل طلبك للعضوية واستلمناه.",
    ...a.choices.map(
      (c, i) =>
        `${["الرغبة الأولى", "الرغبة الثانية", "الرغبة الثالثة"][i] ?? "رغبة"}: ${c}`,
    ),
    "",
    "نراجع الطلبات ونرسل النتيجة خلال أسبوعين عمل. لا حاجة لإعادة التقديم.",
    "",
    `${CLUB} — ${SITE_URL}`,
  ].join("\n");

  return { to: a.email, subject: `وصل طلبك — ${CLUB}`, text, html };
}

/* ── ٢ · النتيجة ──────────────────────────────────────────────────────── */

/** الحالات التي يُراسَل عليها الطالب — و`new`/`reviewing` ليستا منها */
export const NOTIFIABLE = ["accepted", "rejected", "referred"] as const;
export type NotifiableStatus = (typeof NOTIFIABLE)[number];

export function isNotifiable(status: string): status is NotifiableStatus {
  return (NOTIFIABLE as readonly string[]).includes(status);
}

/**
 * بريدُ النتيجة.
 *
 * ⚠️ **الرفضُ يُكتب باحترامٍ بلا وعدٍ كاذب.** لا «للأسف المقاعد امتلأت» إن
 * لم تمتلئ، ولا «سنتواصل معك لاحقًا» إن لم يكن ثمّة تواصل. القاعدةُ في
 * صوت العلامة: صدقٌ لا تلطيفٌ يخدع.
 *
 * `referredTo` اسمُ الجهة التي أُحيل إليها — يُمرَّر مع `referred` وحدها.
 */
export function applicationDecision(
  a: ApplicantMail & { status: NotifiableStatus; referredTo?: string },
): Mail {
  if (a.status === "accepted") {
    const where = a.choices[0]
      ? ` في <strong>${place(a.choices[0])}</strong>`
      : "";
    return {
      to: a.email,
      subject: `قُبل طلبك — ${CLUB}`,
      html: layout(
        "قُبل طلبك",
        p(`مرحبًا ${esc(a.fullName)}،`) +
          p(`<strong>قُبل طلبك للعضوية</strong>${where}.`) +
          p(
            "يتواصل معك قائد الجهة على هذا البريد أو على جوّالك لترتيب الانضمام والمهامّ الأولى.",
          ) +
          p("أهلًا بك معنا."),
      ),
      text: [
        `مرحبًا ${a.fullName}،`,
        "",
        `قُبل طلبك للعضوية${a.choices[0] ? ` في ${a.choices[0]}` : ""}.`,
        "",
        "يتواصل معك قائد الجهة على هذا البريد أو على جوّالك لترتيب الانضمام والمهامّ الأولى.",
        "",
        `${CLUB} — ${SITE_URL}`,
      ].join("\n"),
    };
  }

  if (a.status === "referred") {
    const to = a.referredTo
      ? `<strong>${place(a.referredTo)}</strong>`
      : "جهةٍ أخرى";
    return {
      to: a.email,
      subject: `تحديث على طلبك — ${CLUB}`,
      html: layout(
        "تحديث على طلبك",
        p(`مرحبًا ${esc(a.fullName)}،`) +
          p(
            `راجعنا طلبك، ورأينا أنك أنسب لـ${to} من رغبتك الأولى — فأُحيل طلبك إليها.`,
          ) +
          p("يتواصل معك قائدها لترتيب الانضمام.") +
          p(
            `<span style="color:${MUTED};">إن كنت تفضّل غير ذلك، ردّ على هذي الرسالة.</span>`,
          ),
      ),
      text: [
        `مرحبًا ${a.fullName}،`,
        "",
        `راجعنا طلبك، ورأينا أنك أنسب لـ${a.referredTo ?? "جهةٍ أخرى"} من رغبتك الأولى — فأُحيل طلبك إليها.`,
        "يتواصل معك قائدها لترتيب الانضمام.",
        "",
        "إن كنت تفضّل غير ذلك، ردّ على هذي الرسالة.",
        "",
        `${CLUB} — ${SITE_URL}`,
      ].join("\n"),
    };
  }

  return {
    to: a.email,
    subject: `نتيجة طلبك — ${CLUB}`,
    html: layout(
      "نتيجة طلبك",
      p(`مرحبًا ${esc(a.fullName)}،`) +
        p("راجعنا طلبك، ولم نتمكّن من قبوله هذا الفصل.") +
        p(
          "المقاعد محدودة والطلبات أكثر منها، والاعتذار ليس حكمًا عليك. باب التقديم يُفتح كل فصل، ونسعد بطلبك مرة أخرى.",
        ) +
        p(
          `<span style="color:${MUTED};">تقدر تتابع أنشطتنا وفعالياتنا المفتوحة على <a href="${SITE_URL}" style="color:${ACCENT};" dir="ltr">${SITE_URL.replace(/^https?:\/\//, "")}</a>.</span>`,
        ),
    ),
    text: [
      `مرحبًا ${a.fullName}،`,
      "",
      "راجعنا طلبك، ولم نتمكّن من قبوله هذا الفصل.",
      "",
      "المقاعد محدودة والطلبات أكثر منها، والاعتذار ليس حكمًا عليك. باب التقديم يُفتح كل فصل، ونسعد بطلبك مرة أخرى.",
      "",
      `${CLUB} — ${SITE_URL}`,
    ].join("\n"),
  };
}
