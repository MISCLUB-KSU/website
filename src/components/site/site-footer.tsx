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
                فالمساحة ضيّقة.
                ⚠️ والمعرّف من `link.handle` لا من `SOCIAL_HANDLE`: لينكدإن
                معرّفه `misclub` لا `@mis_club_ksu`، والاسم العامّ كان ينطقه
                قارئ الشاشة خطأً. */}
            <ul className="mt-s1 flex gap-x-s4">
              {SOCIAL_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${link.label} — ${link.handle} (يفتح في موقع خارجي)`}
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
          {/* ═══ محطّة الرحلة الأخيرة — على العلامة الصغيرة نفسها ═══
              أضلاع الشعار تجتمع هنا وتنتهي رحلتها. والمرساة **علامةُ
              الكولوفون القائمة** لا كتلةٌ جديدة: الرحلة تبلغ قاع الصفحة
              بلا أن يزيد ارتفاع التذييل بكسلًا واحدًا — وهو ما جمع الطلبين
              معًا («الفوتر يوقف عند الخط الأحمر» + «يمشي معنا للآخر»).

              ⚠️ **المقاس على الغلاف لا على `Mark`.** الغلاف يحمل الارتفاع
              والنسبة (2701:1016 = عرض 53.2px عند `h-5`)، والشعار بداخله
              `h-full w-full`. فصندوق `getBoundingClientRect` الذي يقيسه
              `mark-morph` هو صندوق الشعار المرسوم بالضبط، ولا حشوَ يكبّره.

              ⚠️ `shrink-0` تلزم: الغلاف داخل `flex-wrap`، وبدونها يضغطه
              الجار على العرض الضيّق فتُقاس مرساةٌ أصغر من الشعار وينحرف
              الانطباق. */}
          <div
            data-mark-anchor="foot"
            className="h-5 shrink-0"
            style={{ aspectRatio: "2701 / 1016" }}
          >
            <div data-mark-static="" className="h-full w-full">
              <Mark decorative className="h-full w-full text-snow/70" />
            </div>
          </div>
          <p className="text-sm text-on-ink-dim">
            نادي نظم المعلومات الإدارية — جامعة الملك سعود
          </p>
        </div>
      </div>

      {/* ⚠️⚠️ **التذييل ينتهي عند سطر الكولوفون أعلاه. لا كتلةَ شعارٍ بعده.**

          كان تحته شعارٌ بعرض التذييل يزيده أكثر من ٦٠٠px، فحُذف بطلبٍ صريح
          مؤيَّدٍ بلقطةٍ عليها خطٌّ أحمر تحت الكولوفون مباشرةً (حسام، ٧ أغسطس
          ٢٠٢٦): «أبي الفوتر يوقف عند الخط الأحمر».

          ⚠️ **ولا تُعاد تلك الكتلة ظنًّا أن محطّة العلامة تحتاجها:** المحطّة
          الأخيرة قائمةٌ فعلًا، ومرساتُها **علامةُ الكولوفون الصغيرة** أعلاه
          (`[data-mark-anchor="foot"]` عليها). فالرحلة تبلغ قاع الصفحة
          والتذييل يبقى قصيرًا — الطلبان مجموعان بلا تنازل.

          ⚠️ ومرّ الموضع بتردّدٍ فاحفظ خلاصته: حُذفت الكتلة، ثم أُعيدت على
          سوء فهمٍ منّي لعبارة «خلّه يوقف هنا» — ظننتها عن العلامة وهي عن
          **التذييل** — ثم حُذفت نهائيًّا وانتقلت المرساة إلى الصغيرة. */}
    </footer>
  );
}
