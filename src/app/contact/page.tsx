import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/site/page-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { SocialMark } from "@/components/site/social-mark";
import { SOCIAL_HANDLE, SOCIAL_LINKS } from "@/content/about";
import {
  CONTACT_EMAIL,
  CONTACT_PLACE,
  CONTACT_REASONS,
} from "@/content/contact";

export const metadata: Metadata = {
  title: "تواصل معنا",
  description: `تواصل مع نادي نظم المعلومات الإدارية بجامعة الملك سعود: ${CONTACT_EMAIL} أو عبر حسابات النادي ${SOCIAL_HANDLE}.`,
  alternates: { canonical: "/contact" },
};

/**
 * تواصل معنا.
 *
 * بلا نموذج رسالة عمدًا: النموذج يحتاج بريدًا يُرسِل ويُستقبَل ويُتابَع،
 * وما دام غير مربوط فهو صندوقٌ يبتلع الرسائل ويقول «تم الإرسال».
 * البريد المباشر يصل، ويبقى في صندوق المرسِل دليلًا أنه أرسل.
 */
export default function ContactPage() {
  return (
    <>
      <SiteHeader />

      <main>
        <PageHeader
          id="contact"
          title="تواصل معنا"
          lede="اكتب لنا مباشرة، أو تابع حسابات النادي — الإعلانات كلها تنزل فيها أولًا."
        />

        <div className="mx-auto max-w-6xl px-s4 py-s8 sm:px-s7">
          <div className="grid gap-s6 lg:grid-cols-[1.1fr_1fr]">
            <section>
              <h2 className="font-display text-xl font-semibold text-fg">
                البريد الإلكتروني
              </h2>
              <p className="mt-s2 max-w-measure text-sm leading-relaxed text-fg-muted">
                أوضح طريق: اكتب موضوع الرسالة في العنوان حتى تصل إلى اللجنة
                المعنيّة مباشرة.
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="mt-s4 inline-flex min-h-11 items-center text-lead font-semibold text-accent underline decoration-line-control underline-offset-4 transition-colors hover:text-accent-hover hover:decoration-current"
                dir="ltr"
              >
                {CONTACT_EMAIL}
              </a>

              <h2 className="mt-s7 font-display text-xl font-semibold text-fg">
                الحسابات
              </h2>
              {/* ⚠️ كان مكتوبًا «حساب واحد على المنصات الثلاث» — وصار غيرَ
                  صحيح: لينكدإن صفحةُ جهةٍ معرّفها `misclub`. والجملة تُقال
                  كما هي لا كما كانت. */}
              <p className="mt-s2 text-sm text-fg-muted">
                على إكس وتيك توك:{" "}
                <span dir="ltr" className="font-medium text-fg">
                  {SOCIAL_HANDLE}
                </span>
                ، وصفحة النادي على لينكدإن.
              </p>
              {/* العلامة بلا صندوق خلفها، وبجانبها اسم المنصة مكتوبًا —
                  فمن لا يعرف العلامة يقرأ الاسم، ولا يُترك للتخمين. */}
              <ul className="mt-s3 flex flex-wrap gap-x-s5">
                {SOCIAL_LINKS.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center gap-s2 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
                    >
                      <SocialMark
                        platform={link.platform}
                        className="size-[18px] shrink-0"
                      />
                      {link.label}
                      <span className="sr-only">(يفتح في موقع خارجي)</span>
                    </a>
                  </li>
                ))}
              </ul>

              <h2 className="mt-s7 font-display text-xl font-semibold text-fg">
                الموقع
              </h2>
              <p className="mt-s2 text-sm leading-relaxed text-fg-muted">
                {CONTACT_PLACE.name}
                <br />
                {CONTACT_PLACE.detail}
              </p>
            </section>

            {/* قبل أن تكتب: أكثر الأسئلة جوابها منشور، والانتظار أسبوعًا
                لجواب موجود في الصفحة خسارةٌ للطرفين. */}
            <section className="bg-bg-raised p-s5 shadow-[inset_0_0_0_1px_var(--border)]">
              <h2 className="font-display text-lg font-semibold text-fg">
                قبل أن تكتب
              </h2>
              <p className="mt-s2 text-sm leading-relaxed text-fg-muted">
                كثير من الأسئلة جوابها منشور هنا — تصلك الإجابة الآن بدل أن
                تنتظر ردًّا.
              </p>

              <ul className="mt-s5 flex flex-col gap-s5">
                {CONTACT_REASONS.map((reason) => (
                  <li
                    key={reason.title}
                    className="border-s-2 border-line-strong ps-s3"
                  >
                    <p className="text-[0.95rem] font-semibold text-fg">
                      {reason.title}
                    </p>
                    <p className="mt-1 text-[0.84rem] leading-relaxed text-fg-muted">
                      {reason.body}
                    </p>
                    {/* ⚠️ **الرابط اختياريّ.** بطاقةُ «المشاريع والفعاليات»
                        بلا رابطٍ ما دامت صفحةُ المشاريع مغلقة — وإرسالُ من
                        يسأل عن مشروعٍ إلى صفحة «ترقّبونا» ثم إعادتُه منها
                        إلى هنا حلقةٌ مفرغة. والبطاقة تامّةٌ بلا رابط: هو
                        على صفحة التواصل أصلًا، والوسائل أمامه. */}
                    {"href" in reason ? (
                      <Link
                        href={reason.href}
                        className="mt-1 inline-flex min-h-11 items-center text-[0.84rem] font-medium text-accent underline decoration-line-control underline-offset-4 transition-colors hover:text-accent-hover hover:decoration-current"
                      >
                        {reason.hrefLabel}
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
