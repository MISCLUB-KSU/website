"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * شريط أفقي — البطاقات تنساب جانبًا بدل أن تنزل في شبكة.
 *
 * البناء **تمرير أصيل** (`overflow-x` + `scroll-snap`) لا مكتبة دوّارة:
 * يعمل بلا جافاسكربت أصلًا — باللمس على الجوال، وبلوحة المفاتيح عبر الروابط
 * التي بداخله (المتصفح يمرّر العنصر المركَّز إلى الرؤية بنفسه). السهمان
 * تحسينٌ فوق ذلك لا شرطٌ له: من يعطّل الجافاسكربت يبقى الشريط كاملًا.
 *
 * ولذلك لا `embla` ولا غيرها: المكتبة تبني الدوّارة على `transform`، فإن لم
 * تُقلَع بقي المحتوى مكدّسًا أو مقطوعًا. والتمرير الأصيل لا يُقلَع — هو
 * المتصفح نفسه.
 *
 * الاتجاه: الصفحة `rtl`، و`scrollLeft` فيها سالب في المتصفحات الحديثة.
 * فلا تُفترض إشارة، بل تُقاس من `scrollLeft` نفسه عند كل نقرة.
 */

type RailProps = {
  /** يُنطق لقارئ الشاشة عند دخول المنطقة، ويصف ما فيها */
  label: string;
  children: React.ReactNode;
};

/** هامش خطأ للبكسل الكسري — `scrollLeft` ليس عددًا صحيحًا دائمًا */
const EDGE = 4;

export function Rail({ label, children }: RailProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;

    /* القيمة المطلقة توحّد الاتجاهين: في `rtl` تنزل `scrollLeft` سالبةً
       كلّما تقدّم القارئ، وفي `ltr` تصعد موجبةً. */
    const travelled = Math.abs(el.scrollLeft);
    const max = el.scrollWidth - el.clientWidth;

    setAtStart(travelled <= EDGE);
    setAtEnd(travelled >= max - EDGE);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    sync();
    el.addEventListener("scroll", sync, { passive: true });

    /* الشريط يتغيّر طوله بتغيّر المقاس — بلا هذا يبقى السهم معطّلًا بعد
       دوران الجوال وإن صار خلفه بطاقات. */
    const observer = new ResizeObserver(sync);
    observer.observe(el);

    return () => {
      el.removeEventListener("scroll", sync);
      observer.disconnect();
    };
  }, [sync]);

  /** خطوة = عرض بطاقة واحدة، تُقاس من أول بطاقة فعلية لا تُفترض */
  function step(direction: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;

    const card = el.querySelector("li");
    const list = el.firstElementChild;
    const gap = list
      ? Number.parseFloat(getComputedStyle(list).columnGap) || 0
      : 0;
    const distance = (card?.offsetWidth ?? el.clientWidth * 0.8) + gap;

    /* الإشارة تُشتقّ من اتجاه الكتابة: `inline-end` في `rtl` يسارًا. */
    const rtl = getComputedStyle(el).direction === "rtl";
    el.scrollBy({ left: distance * direction * (rtl ? -1 : 1), behavior: "smooth" });
  }

  return (
    <div>
      {/* السهمان في نهاية السطر — أي يسارًا في العربية، مقابل العنوان.
          `js-only` يخفيهما بلا جافاسكربت، فلا يبقى زرّ لا يفعل شيئًا. */}
      <div className="js-only mb-s4 flex justify-end gap-s2">
        <RailButton
          onClick={() => step(-1)}
          disabled={atStart}
          label="السابق"
          glyph="→"
        />
        <RailButton
          onClick={() => step(1)}
          disabled={atEnd}
          label="التالي"
          glyph="←"
        />
      </div>

      {/* الهوامش السالبة تُخرج الشريط إلى حافّة الشاشة، والحشو يعيد أول
          بطاقة إلى عمود المحتوى — فتُطلّ البطاقة التالية من الحافّة بدل أن
          تُقصّ عندها. و`snap-start` يُوقف كل بطاقة على العمود نفسه. */}
      {/* المنطقة والقائمة منفصلتان عمدًا: `role="region"` على `<ul>` يُلغي
          دلالة القائمة عند قارئ الشاشة، فلا يعود يقول «قائمة من ٦». فالغلاف
          يحمل المنطقة والتمرير، والقائمة تبقى قائمة، والبطاقات `<li>` هي
          أهداف الالتقاط — وهي أحفاد الحاوية، وهذا يكفي `scroll-snap`. */}
      <div
        ref={trackRef}
        role="region"
        aria-label={label}
        className={
          "-mx-s4 snap-x snap-mandatory overflow-x-auto px-s4 pb-s2 " +
          "sm:-mx-s7 sm:px-s7 " +
          "[-ms-overflow-style:none] [scrollbar-width:none] " +
          "[&::-webkit-scrollbar]:hidden " +
          "motion-safe:scroll-smooth"
        }
      >
        <ul className="flex gap-s4">{children}</ul>
      </div>
    </div>
  );
}

function RailButton({
  onClick,
  disabled,
  label,
  glyph,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  glyph: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      /* حادّ لا دائري: `--radius: 0` قاعدة النظام لا استثناؤه.
         والمعطَّل يخفت ولا يختفي — اختفاؤه يُقفز بالسطر كلّه. */
      className={
        "rake rake-sm inline-flex size-11 items-center justify-center " +
        "bg-bg-raised text-fg shadow-[inset_0_0_0_1px_var(--border)] " +
        "transition-colors hover:bg-bg-sunken " +
        "disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-bg-raised"
      }
    >
      <span aria-hidden className="text-lg leading-none">
        {glyph}
      </span>
    </button>
  );
}
