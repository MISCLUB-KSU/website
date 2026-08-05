import Link from "next/link";

import { HeroField } from "@/components/site/hero-field";
import { PRIMARY_ACTION } from "@/content/navigation";

/**
 * الواجهة الأولى.
 *
 * **التركيب — ولماذا ليس المكدّس المعتاد:** «شارة ← عنوان ← سطر شارح ←
 * زرّان» تركيبٌ على مليون صفحة، وهو سلوبٌ حتى لو أُتقن لونه وخطّه.
 * فالتركيب هنا **مُقابِل**: العنوان يثقُل يمينًا حيث تبدأ القراءة، وحالة
 * التقديم تقابله يسارًا على خطّ القاعدة نفسه، والفراغ بينهما يملؤه الحقل.
 * تُقرأ الشاشة لوحةً واحدة لا عمودًا مرصوصًا.
 *
 * **التفاعل:** الحقل خلفها يستجيب للمؤشّر (`hero-field.tsx`) — ضرباته
 * تنفرج تحت اليد وتعود حين تبتعد. هذا هو «العنصر الواحد المبهر»: شيءٌ
 * **يشغّله الزائر**، لا يتحرّك من تلقاء نفسه. والفرق جوهري: الحركة
 * الذاتية رُفضت من قبل («مره اوفر») لأنها تُقرأ صخبًا لم يطلبه أحد، وما
 * يتحرّك باليد يُقرأ إتقانًا.
 *
 * ⚠️ **لا يُخفى محتوًى بانتظار تفاعل.** لا شفافيةَ صفرية ولا حركةَ دخول:
 * العنوان والحالة والرابط مرسومةٌ كاملةً من أول إطار. الحقل زخرفةٌ خالصة
 * (`aria-hidden`)، ولو لم يعمل جافاسكربت إطلاقًا بقيت الواجهة كما هي.
 *
 * والواجهة تملأ الطية (`100svh` ناقص الشريط) فلا يطلّ نصفُ قسمٍ من تحتها.
 */

type HeroProps = {
  /** حالتان لا ثالثة — لا «قريبًا» */
  isOpen: boolean;
};

export function Hero({ isOpen }: HeroProps) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative isolate flex min-h-[calc(100svh-var(--header-h))] flex-col justify-end overflow-hidden bg-surface-ink px-s4 py-s7 sm:px-s7"
    >
      <HeroField />

      <div className="mx-auto grid w-full max-w-6xl gap-s6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-end lg:gap-s7">
        <div>
          {/* اسم الجهة سطرٌ واحد بلا كبسولة ولا حروف مباعدة */}
          <p className="text-sm font-medium text-on-ink-dim">
            نادي نظم المعلومات الإدارية في جامعة الملك سعود
          </p>

          {/* بلا `leading-`: الارتفاع من `--lh-display` وحده */}
          <h1
            id="hero-heading"
            className="mt-s4 max-w-[20ch] font-display text-display font-bold text-snow"
          >
            بين الإدارة والتقنية، نصنع الأثر.
          </h1>

          <p className="mt-s5 max-w-[52ch] text-lead leading-relaxed text-on-ink">
            مجتمع طلابي يحوّل المعرفة إلى خبرة، والأفكار إلى مشاريع، والطموح
            إلى مستقبل مهني أوضح.
          </p>
        </div>

        {/* الحالة تقابل العنوان ولا تجلس تحته */}
        <div className="lg:justify-self-end lg:text-end">
          <p className="flex items-center gap-s3 lg:justify-end">
            <span
              aria-hidden
              className="mis-slant inline-block h-4 w-1 shrink-0 bg-sky"
            />
            <span className="text-sm font-semibold text-snow">
              {isOpen ? "التقديم مفتوح" : "التقديم مغلق حاليًا"}
            </span>
          </p>

          {isOpen ? (
            <Link
              href={PRIMARY_ACTION.href}
              className="rake rake-sm rake-interactive mt-s5 inline-flex min-h-11 items-center bg-snow px-s6 text-sm font-bold text-surface-ink transition-colors hover:bg-sky"
            >
              {PRIMARY_ACTION.label}
            </Link>
          ) : (
            <p className="mt-s4 max-w-[32ch] text-sm leading-relaxed text-on-ink-dim lg:ms-auto">
              يُفتح التقديم لكل اللجان والمشاريع في اللحظة نفسها. تابع الإعلان.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
