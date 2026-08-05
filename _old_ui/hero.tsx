import Link from "next/link";

import { Reveal } from "@/components/motion";
import { RakedField } from "@/components/site/raked-field";
import { PRIMARY_ACTION } from "@/content/navigation";

/**
 * الواجهة الأولى.
 *
 * الحقل المائل يعيش **هنا** لا خلف الصفحة كلّها: القاعدة في `.impeccable.md`
 * أن الميلان توقيعٌ لا نمط — موضعان اثنان في الموقع، هذا والتذييل.
 *
 * التركيب مقصود ألّا يكون الكومة المعتادة (لصيقة ← عنوان ← سطر ← زرّان):
 * المحتوى مرسًى إلى قاع الإطار، والحالة تجلس على خطّ قاعدة العنوان لا تحته.
 *
 * ⚠️ **قائمة المشاريع الستة أُزيلت من هنا** بطلب مباشر. كانت نقلًا لبنية
 * المرجع (قائمة خدمات أحادية المسافة)، وهي تزاحم العنوان وتكرّر ما في قسم
 * المشاريع أسفل الصفحة. النصوص الأربعة أدناه هي نصوص الواجهة الأصلية.
 */

type HeroProps = {
  /** حالتان لا ثالثة — لا «قريبًا» */
  isOpen: boolean;
};

export function Hero({ isOpen }: HeroProps) {
  return (
    <section className="raked-field grain grid min-h-[calc(100svh-var(--header-h))] grid-rows-[1fr_auto] px-s4 py-s6 text-on-ink sm:px-s7 sm:py-s7">
      <RakedField id="hero" />

      <div className="mx-auto grid w-full max-w-6xl items-end gap-s5 self-end lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-s7">
        <div>
          <Reveal>
            {/* اسم الجهة لا لصيقة زينة: سطر واحد بلا كبسولة ولا حروف مباعدة */}
            <p className="mb-s3 text-sm font-medium text-on-ink">
              نادي نظم المعلومات الإدارية في جامعة الملك سعود
            </p>
          </Reveal>

          <Reveal>
            {/* سطران بكسر مقصود بعد الفاصلة — على الجوال يترك للنص أن ينساب.
                بلا `leading-`: الارتفاع من `--lh-display` وحده. */}
            <h1 className="max-w-[22ch] font-display text-display font-bold text-snow">
              بين الإدارة والتقنية،
              <br className="hidden sm:block" /> نصنع الأثر.
            </h1>
          </Reveal>

          <Reveal>
            <p className="mt-s4 max-w-[54ch] text-lead text-snow">
              مجتمع طلابي يحوّل المعرفة إلى خبرة، والأفكار إلى مشاريع، والطموح
              إلى مستقبل مهني أوضح.
            </p>
          </Reveal>
        </div>

        <Reveal className="grid justify-items-start gap-s3">
          <p className="inline-flex items-center gap-s2 text-sm font-semibold text-snow">
            <span aria-hidden className="mis-slant inline-block h-3.5 w-1 bg-snow" />
            {isOpen ? "التقديم مفتوح" : "التقديم مغلق حاليًا"}
          </p>
          {isOpen ? (
            <Link
              href={PRIMARY_ACTION.href}
              className="rake rake-sm rake-interactive inline-flex min-h-11 items-center bg-snow px-s5 font-semibold text-deep transition-colors hover:bg-sky"
            >
              {PRIMARY_ACTION.label}
            </Link>
          ) : (
            <p className="max-w-[28ch] text-sm text-snow">
              يُفتح التقديم لكل اللجان والمشاريع في اللحظة نفسها. تابع الإعلان.
            </p>
          )}
        </Reveal>
      </div>
    </section>
  );
}
