import "server-only";

import { Resend } from "resend";

/**
 * إرسال البريد — طبقةٌ رقيقة فوق `Resend`.
 *
 * ⚠️ **صامتٌ حين لا مفتاح، لا ساقط.** التطوير المحلّي وبناء CI يعملان بلا
 * `RESEND_API_KEY`، ولو رمى غيابُه لسقط نموذجُ التقديم كلُّه على من يشغّل
 * المشروع أوّل مرّة. فالغيابُ يُسجَّل ويمضي — وهو حالةٌ مقصودةٌ لا عطل.
 *
 * ⚠️ **ولا يُرمى من فشل الإرسال أبدًا.** نفس قاعدة رفع السيرة الذاتية في
 * `join/actions.ts`: أن يصل الطلبَ بلا بريدِ تأكيدٍ خيرٌ من أن يُردَّ الطالب
 * بخطأ بعد أن ملأ ثلاث خطوات. والفشلُ يُسجَّل ليُراجَع.
 */

/** المرسِل — نطاقٌ موثَّقٌ في لوحة Resend، وإلّا رُفض الإرسال */
const FROM = process.env.RESEND_FROM ?? "نادي MIS <onboarding@resend.dev>";

/**
 * ⚠️ **يُبنى عند الطلب لا في نطاق الوحدة.** بناؤه عند الاستيراد يجعل
 * غيابَ المفتاح خطأً في **زمن البناء** — و`next build` يستورد هذا الملفّ
 * وهو لا يملك أسرارَ الإنتاج.
 */
function client(): Resend | undefined {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : undefined;
}

export type Mail = {
  to: string;
  subject: string;
  /** نصٌّ عاديّ — يقرؤه من يعطّل HTML، ويرفع تقدير مكافحات السخام */
  text: string;
  html: string;
};

export type MailResult =
  | { sent: true; id: string }
  | { sent: false; reason: "no-key" | "failed" };

export async function sendMail(mail: Mail): Promise<MailResult> {
  const resend = client();
  if (!resend) {
    console.warn("[mail] RESEND_API_KEY غير مضبوط — لم يُرسَل", {
      to: mail.to,
      subject: mail.subject,
    });
    return { sent: false, reason: "no-key" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    if (error || !data) {
      console.error("[mail] تعذّر الإرسال", {
        to: mail.to,
        error: error?.message,
      });
      return { sent: false, reason: "failed" };
    }
    return { sent: true, id: data.id };
  } catch (error) {
    console.error("[mail] استثناءٌ أثناء الإرسال", {
      to: mail.to,
      error: error instanceof Error ? error.message : String(error),
    });
    return { sent: false, reason: "failed" };
  }
}
