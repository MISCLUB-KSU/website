"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  createRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

/**
 * طبقة الجوّال الحركية — الموقع بُني للحاسب أولًا، وطلب حسام أن يصير
 * الجوّال **أفضل منه**. هذي الطبقة تضيف ولا تبدّل: كل قطعةٍ هنا غلافٌ
 * حول محتوًى مُصيَّرٍ على الخادم، يمرّره كما هو ويعلّق عليه حركةً
 * يقودها التمرير.
 *
 * ── القواعد الأربع التي لا تُتنازَل ─────────────────────────────────────
 *
 * ⚠️ **لا محتوى يبدأ مخفيًّا.** لا `opacity: 0` ابتدائيًّا في أي عنصرٍ
 * يحمل معنًى: الرزمة تتحرّك بـ`scale/rotate` وقيمتها الابتدائية هي حالة
 * السكون، والحبرُ طبقةُ تظليلٍ فوق نصٍّ قاعدته مقروءةٌ دائمًا (6.76:1).
 * تعثّرت الحركة؟ بقيت الصفحة كاملةً.
 *
 * ⚠️ **الحاسب لا يتغيّر بشعرة.** كل التحويلات خلف `useIsMobile`، فتُحسب
 * `1` فوق 1023px — والخادم يُصيّر حالة الحاسب فلا وميض ترطيب.
 *
 * ⚠️ **`transform` و`opacity` فقط** — لا خاصيّة تخطيطٍ تُحرَّك.
 *
 * ⚠️ **`prefers-reduced-motion` تطفئ القيادة بالتمرير كلّها**، ويبقى
 * الالتصاق — فهو تخطيطٌ لا حركة.
 */

/** حالة الجوّال — تُقرأ مرّةً وتتبع تغيّر المقاس. الخادم يفترض الحاسب. */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsMobile(q.matches);
    sync();
    q.addEventListener("change", sync);
    return () => q.removeEventListener("change", sync);
  }, []);
  return isMobile;
}

/* ── رزمة الركائز — بطاقاتٌ تتراكب بعمقٍ حقيقيّ ──────────────────────────
   على الجوّال تلتصق كلُّ بطاقةٍ قرب أعلى الشاشة بإزاحةٍ متدرّجة، فتنزلق
   التالية فوقها وتُرى حوافُّ السابقات من خلفها رزمةً. والبطاقة المغادرة
   تتقلّص وتميل للخلف (`rotateX`) فتُقرأ عمقًا لا تكديسًا.

   ⚠️ مراسي `MarkMorph` داخل البطاقات آمنة: `place()` تعيد قياس المراسي
   عند كل تمريرة (`mark-morph.tsx:101`)، فالضلع يتبع بطاقته أينما التصقت —
   ويُرسم خلفها المعتمة كما كان. */

type DeckItemProps = {
  selfRef: RefObject<HTMLLIElement | null>;
  /** البطاقة التالية — تقدّمها هو ما يُقلّص هذي. الأخيرة بلا تالٍ فلا تتقلّص */
  nextRef: RefObject<HTMLLIElement | null> | null;
  index: number;
  isMobile: boolean;
  calm: boolean;
  className: string;
  children: ReactNode;
};

function DeckItem({
  selfRef,
  nextRef,
  index,
  isMobile,
  calm,
  className,
  children,
}: DeckItemProps) {
  /* التقدّم من رحلة **التالية** لا من هذي: الملتصقُ صندوقُه مثبَّتٌ فلا
     يصلح مقياسًا، والتالية تسري في التدفّق فقياسُها صادق. */
  const { scrollYProgress } = useScroll({
    target: (nextRef ?? selfRef) as RefObject<HTMLElement>,
    offset: ["start end", "start 0.45"],
  });

  const active = isMobile && !calm && nextRef !== null;
  const scale = useTransform(scrollYProgress, (p) =>
    active ? 1 - p * 0.05 : 1,
  );
  const rotateX = useTransform(scrollYProgress, (p) => (active ? p * -3.5 : 0));

  return (
    <motion.li
      ref={selfRef}
      className={`${className} max-lg:sticky`}
      style={{
        scale,
        rotateX,
        transformPerspective: 1200,
        transformOrigin: "top center",
        /* الإزاحة المتدرّجة: كلُّ بطاقةٍ تلتصق أخفض من سابقتها قليلًا،
           فتبقى حوافُّ الرزمة مرئيّة */
        top: isMobile
          ? `calc(var(--header-h, 76px) + ${10 + index * 14}px)`
          : undefined,
      }}
    >
      {children}
    </motion.li>
  );
}

type PillarDeckProps = {
  /** بطاقاتٌ مُصيَّرةٌ على الخادم — الغلاف لا يعرف محتواها ولا يلمسه */
  items: readonly ReactNode[];
  className: string;
  itemClassName: string;
};

export function PillarDeck({
  items,
  className,
  itemClassName,
}: PillarDeckProps) {
  const isMobile = useIsMobile();
  const calm = useReducedMotion() ?? false;

  /* مراجعُ ثابتةٌ بعدد البطاقات — `createRef` داخل `useMemo` لا خطاف داخل
     حلقة */
  const refs = useMemo(
    () =>
      Array.from({ length: items.length }, () => createRef<HTMLLIElement>()),
    [items.length],
  );

  return (
    <ul className={className}>
      {items.map((item, index) => (
        <DeckItem
          key={index}
          selfRef={refs[index]}
          nextRef={index < items.length - 1 ? refs[index + 1] : null}
          index={index}
          isMobile={isMobile}
          calm={calm}
          className={itemClassName}
        >
          {item}
        </DeckItem>
      ))}
    </ul>
  );
}

/* ── الحبر يتبع القراءة ──────────────────────────────────────────────────
   جملة «من نحن» الافتتاحية تُرسم كاملةً بلون النصّ الهادئ (مقروءًا دائمًا)،
   وفوق كل كلمةٍ طبقةُ حبرٍ كامل تتكشّف بتقدّم التمرير — فتتحبّر الجملة
   كلمةً كلمة مع القراءة. */

type WordProps = {
  word: string;
  index: number;
  count: number;
  progress: MotionValue<number>;
  active: boolean;
};

function InkWord({ word, index, count, progress, active }: WordProps) {
  /* نافذة كل كلمة تتراكب مع جارتها قليلًا فيسيل الحبر بلا قفزات */
  const from = index / count;
  const to = Math.min(1, (index + 1.6) / count);
  const raw = useTransform(progress, [from, to], [0, 1]);
  const opacity = useTransform(raw, (v) => (active ? v : 1));

  return (
    <span className="relative inline-block">
      {/* القاعدة المقروءة دائمًا — 6.76:1 على الأرضية */}
      <span className="text-fg-muted">{word}</span>
      {/* طبقة الحبر — زخرفةٌ فوق نصٍّ قائم، لا النصّ نفسه.
          ⚠️ `select-none` و`pointer-events-none` لازمتان: بدونهما يلتقط
          التحديدُ الطبقتين فتُنسخ كلُّ كلمةٍ مرّتين («نادينادي») — قِيس
          فوُجد في `textContent`. و`aria-hidden` تحجب قارئ الشاشة وحده،
          لا التحديد. */}
      <motion.span
        aria-hidden
        className="text-fg pointer-events-none absolute inset-0 select-none"
        style={{ opacity }}
      >
        {word}
      </motion.span>
    </span>
  );
}

type InkWordsProps = {
  text: string;
  className?: string;
};

export function InkWords({ text, className }: InkWordsProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const isMobile = useIsMobile();
  const calm = useReducedMotion() ?? false;
  const { scrollYProgress } = useScroll({
    target: ref,
    /* تبدأ حين تدخل الجملة ثلثَ الشاشة الأسفل وتكتمل قرب وسطها — نافذةُ
       القراءة الطبيعية نفسها */
    offset: ["start 0.9", "start 0.4"],
  });

  /* على الحاسب ومع تقليل الحركة: حبرٌ كاملٌ ثابت — مظهرُ الصفحة قبل هذي
     الطبقة بالضبط */
  const active = isMobile && !calm;
  const words = text.split(" ");

  return (
    <p ref={ref} className={className}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`}>
          {index > 0 && " "}
          <InkWord
            word={word}
            index={index}
            count={words.length}
            progress={scrollYProgress}
            active={active}
          />
        </span>
      ))}
    </p>
  );
}
