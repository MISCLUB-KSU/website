import Link from "next/link";

import { Mark } from "@/components/site/mark";
import { SocialMark } from "@/components/site/social-mark";
import { SOCIAL_HANDLE, SOCIAL_LINKS } from "@/content/about";
import { CONTACT_EMAIL, CONTACT_PLACE } from "@/content/contact";
import { ABOUT_SECTION, FOOTER_LINKS } from "@/content/navigation";

/**
 * التذييل — العلامة كبيرة ومرساة إلى القاع، والروابط فوقها على نفس الشبكة
 * التي يقف عليها المحتوى. لا تشتيت الكتل إلى الحوافّ ولا أعمدة معلّقة.
 *
 * الشريط العلوي ستة عناصر فقط، فما خرج منه («اللجان» و«المقالات») يعيش
 * هنا — لا صفحة في الموقع بلا طريق يصل إليها.
 */

const LINK_CLASS =
  /* ⚠️ **`px-s2` إلزامي لا زخرفة** — نفس علّة `nav-links.tsx`: بلا حشوٍ
     أفقي كان عرض «اللجان» 33.56px (أقصر بـ10.44px) و«المقالات» 43.21px.
     الحشو مُضاف على الجهتين فيرفع «اللجان» — أضيق رابطٍ في التذييل — إلى
     ٤٩.٥٦px، بهامش أمان لا بالحدّ بالضبط. */
  "inline-flex min-h-11 items-center px-s2 text-sm text-on-ink-dim " +
  "transition-colors hover:text-snow";

export function SiteFooter() {
  /* بلا هامش علوي: التذييل حقلٌ داكن يفصله لونُه عمّا فوقه، فالهامش
     (`mt-s9` = 96px) كان يترك شريط بياضٍ معلّقًا بين آخر قسم وبينه —
     فراغًا لا يفصل شيئًا لأن الفصل واقعٌ باللون أصلًا. حشو القسم الأخير
     السفلي (64px) يبقى: هو إيقاع الأقسام لا هامش التذييل. */
  return (
    <footer className="raked-field grain text-on-ink">
      <div className="above-mark mx-auto max-w-6xl px-s4 pt-s7 sm:px-s7">
        <nav
          className="grid gap-s6 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="روابط التذييل"
        >
          <div>
            <h2 className="text-sm font-bold text-snow">
              {ABOUT_SECTION.label}
            </h2>
            <ul className="mt-s2">
              {ABOUT_SECTION.children?.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK_CLASS}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-bold text-snow">أقسام</h2>
            <ul className="mt-s2">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={LINK_CLASS}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-bold text-snow">تواصل</h2>
            <ul className="mt-s2">
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className={LINK_CLASS}
                  dir="ltr"
                >
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li>
                <Link href="/contact" className={LINK_CLASS}>
                  <span dir="ltr">{SOCIAL_HANDLE}</span>
                </Link>
              </li>
            </ul>

            {/* العلامات وحدها هنا — الاسم مكتوب في `aria-label` لا بجانبها،
                فالمساحة ضيّقة والحساب واحد على الثلاث. */}
            <ul className="mt-s1 flex gap-x-s4">
              {SOCIAL_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${link.label} — ${SOCIAL_HANDLE} (يفتح في موقع خارجي)`}
                    className="inline-flex size-11 items-center justify-center text-on-ink-dim transition-colors hover:text-snow"
                  >
                    <SocialMark platform={link.platform} className="size-5" />
                  </a>
                </li>
              ))}
            </ul>

            <p className="mt-s2 max-w-[34ch] text-sm text-on-ink-dim">
              {CONTACT_PLACE.name}، {CONTACT_PLACE.detail}.
            </p>
          </div>
        </nav>

        {/* شريط سفلي عادي: علامة صغيرة وسطر تعريف فوق فاصل رفيع.
            التوقيع العملاق أُزيل بطلب مباشر — كان يأخذ ٤٠٠px من ارتفاع
            التذييل، وهذا وزنٌ لا يحتمله تذييل موقع نادٍ. */}
        <div className="mt-s7 flex flex-wrap items-center justify-between gap-s3 border-t border-snow/15 py-s5">
          <Mark decorative className="h-5 w-auto text-snow/70" />
          <p className="text-sm text-on-ink-dim">
            نادي نظم المعلومات الإدارية — جامعة الملك سعود
          </p>
        </div>
      </div>

      {/* اجتماع العلامة — الشعار ملتصقٌ بالحافّة السفلى بلا فجوة تحته،
          فيُقرأ توقيعًا لا نصًّا مركونًا.
          ⚠️ `data-mark-static` على الغلاف لا على `Mark` — فهو لا ينشر خصائص.
          ⚠️ **حشو الجهتين (`px-s4`/`sm:px-s7`) على غلافٍ خارجيٍّ يحيط
          بالمرساة، لا على `[data-mark-anchor]` نفسها.** كان الحشو على نفس
          عنصر المرساة، فيدخل داخل الصندوق الذي يقيسه `getBoundingClientRect`
          (يشمل الحشو دومًا) بينما الشعار الساكن بداخلها يملأ صندوق
          *المحتوى* فقط (`h-full w-full` بعد الحشو) — فيكبر `kFoot` في
          `mark-morph.tsx` عن حجم الشعار المرسوم فعليًا. قِيس فعليًّا: على
          1280px الشعار المتشكّل 1152px@x=64 مقابل الساكن 1056px@x=112
          (٤٨px لكل جهة)، وعلى 320px: 320 مقابل 288. المرساة الآن بلا حشوٍ
          خاصٍّ بها، فصندوقها المقيس هو صندوق الشعار المرسوم بالضبط. */}
      <div aria-hidden className="mx-auto mt-s8 w-full max-w-[72rem] px-s4 sm:px-s7">
        <div
          data-mark-anchor="foot"
          className="w-full"
          style={{ aspectRatio: "2701 / 1016" }}
        >
          <div data-mark-static="" className="h-full w-full">
            <Mark decorative className="h-full w-full text-on-ink" />
          </div>
        </div>
      </div>
    </footer>
  );
}
