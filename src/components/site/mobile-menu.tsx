"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { useHydrated } from "@/lib/use-hydrated";

/**
 * قائمة الجوال — `<details>` أصيل يعمل بلا جافاسكربت.
 *
 * الأصل باقٍ: القائمة **غير متحكَّم بها** عمدًا، تُفتح وتُغلق بالمتصفح وحده،
 * والحالةُ تُقرأ من حدث `toggle` لا تُملى عليه. فمن عطّل الجافاسكربت تبقى
 * عنده قائمةٌ كاملة — بلا ستارةٍ ولا قفلِ تمرير، وهما زيادةٌ لا شرط.
 *
 * والجافاسكربت يضيف أربعةً كانت ناقصة، وكلُّها من سلوك القوائم المتوقَّع:
 *  · **الإغلاق بعد الانتقال** — التنقّل في App Router لا يعيد بناء الشريط،
 *    فتبقى القائمة مفتوحةً فوق الصفحة الجديدة تحجب أوّلها.
 *  · **`Escape`** — لم تكن تُغلقها؛ `<details>` لا يستجيب لها أصلًا.
 *  · **ستارةٌ تُنقر فتُغلق** — كانت الصفحة خلفها حيّةً تمامًا: تُنقر روابطُها
 *    ويُمرَّر محتواها والقائمةُ مفتوحةٌ فوقها.
 *  · **قفلُ تمرير الصفحة** ما دامت مفتوحة.
 *
 * ⚠️ **وتُغلق حين يتجاوز العرضُ `lg`.** اللوحة `lg:hidden`، فلو بقيت
 * مفتوحةً بعد تدوير الجهاز أو تكبير النافذة لبقي **جسمُ الصفحة مقفولًا عن
 * التمرير وقائمةٌ لا تُرى** هي السبب — عطلٌ لا مخرج منه إلا إعادة التحميل.
 */

/** يطابق عتبة `lg` في Tailwind — وهي حيث تظهر الأقسام على سطرٍ واحد */
const WIDE = "(min-width: 1024px)";

type MobileMenuProps = {
  /** الاسم المنطوق — الزرّ صار صامتًا بصريًّا، فلا يبقى له نصٌّ يُقرأ */
  label: string;
  /** ما يُرى في الزرّ. صار **العلامة نفسَها** بعد أن حُذف نصّ «القائمة» */
  trigger: ReactNode;
  className: string;
  summaryClassName: string;
  children: ReactNode;
};

export function MobileMenu({
  label,
  trigger,
  className,
  summaryClassName,
  children,
}: MobileMenuProps) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const hydrated = useHydrated();

  /* الإغلاق يجري على العنصر مباشرة، وحدثُ `toggle` يردّ الحالة إلى React —
     فلا مصدرَ حقيقةٍ ثانٍ يتخلّف عن الوسم. */
  function close() {
    const el = ref.current;
    if (el) el.open = false;
  }

  /**
   * ⚠️ **لا تُغلق عند التركيب — عند الانتقال فقط.**
   *
   * `<details>` يعمل قبل أن يصل الجافاسكربت أصلًا. فمن ضغط العلامة في تلك
   * اللحظة فُتحت له القائمة، ثم يهبط React فيُشغّل هذا المؤثّر أوّلَ مرّة
   * **فيغلقها في وجهه**. أمسكتُه بالقياس: ضغطةٌ بعد إعادة تحميلٍ مباشرةً
   * تركت `open=false` وستارةً غير مركَّبة — والشاشةُ تُظهر لوحةً فارغة.
   * وعلى جهازٍ بطيء النافذةُ أوسع، فهو عطلٌ حقيقيّ لا حالةُ اختبار.
   *
   * والمرجعُ يتخطّى التشغيل الأوّل — نفسُ نمط `registration-form.tsx`.
   */
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    close();
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        /* التركيز يعود إلى الزرّ الذي فتحها — وإلّا سقط إلى أوّل الصفحة */
        ref.current?.querySelector<HTMLElement>("summary")?.focus();
      }
    };

    const wide = window.matchMedia(WIDE);
    const onWide = () => {
      if (wide.matches) close();
    };

    /* القفل يُعاد إلى ما كان لا إلى `""` — الصفحة قد تكون ضابطةً للقيمة */
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  return (
    <details
      ref={ref}
      className={className}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      {/* ⚠️ **`aria-label` لازمة — الزرّ صار بلا نصّ.**
          كان نصّه «القائمة» يُقرأ، وبعد أن صارت العلامةُ وحدَها هي الزرّ
          لم يبقَ فيه ما يُنطق: `<Mark>` رسمٌ `aria-hidden`، والميلانُ زخرفة.
          فبلا هذي السمة يسمع مستخدمُ قارئ الشاشة «مطويّة» بلا اسم.
          و`<summary>` يُعلن حالةَ الفتح والطيّ من نفسه، فلا تُكتب يدويًّا. */}
      <summary className={summaryClassName} aria-label={label}>
        {trigger}
        {/* ثلاثُ ضرباتٍ بميل الشعار — الميلُ على الحاوية لا على الضربة،
            والتعليل في `globals.css`. */}
        <span
          aria-hidden
          className="mis-menu-bars flex shrink-0 flex-col gap-[4px]"
        >
          <span className="block h-[2px] w-5 bg-accent" />
          <span className="block h-[2px] w-5 bg-accent" />
          <span className="block h-[2px] w-5 bg-accent" />
        </span>
      </summary>
      {children}
      {/* ⚠️ **الستارة في `body` لا في الشريط.** الشريط `z-50`، وستارةٌ داخله
          تُرسم فوق شعاره وزرّه فتُعتِمهما — وهما ظاهران فوقها بالتصميم.
          فتُنقل إلى جذر المستند عند `z-40`: تحت الشريط وفوق الصفحة. */}
      {hydrated &&
        open &&
        createPortal(
          <div
            className="mis-menu-scrim fixed inset-0 z-40"
            aria-hidden
            onClick={close}
          />,
          document.body,
        )}
    </details>
  );
}
