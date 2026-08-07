"use client";

import { useEffect, useRef } from "react";

import { MARK_POINTS } from "@/lib/geometry.generated";
import { MARK_BOXES, type MarkBox } from "@/lib/mark-boxes";

/**
 * العلامة تتشكّل مع التمرير.
 *
 * ستّة أضلاع الشعار تنتقل بين أربع حالات — الرحلة تمسح الصفحة من قمّتها
 * إلى قاعها، وهذا **مقصودٌ لا عرَضيّ**: «التشكّل قوّة هذا الموقع».
 *   أ) مجتمعةً شعارًا في الواجهة   — `[data-mark-anchor="hero"]`
 *   ب) متفرّقةً على مراسي الأقسام  — `[data-mark-dock]` × ٦
 *   ج) مجتمعةً عند الأسئلة        — `[data-mark-anchor="rest"]`
 *   د) مجتمعةً توقيعًا في التذييل  — `[data-mark-anchor="foot"]`
 *
 * ⚠️ المحطّة (د) **اختياريّة**: صفحةٌ بلا مرساة تذييلٍ تقف الرحلة عند (ج)
 * بلا عطل. أمّا (أ) و(ج) فلازمتان — بلا إحداهما تُخفى الطبقة كلّها.
 *
 * ⚠️ **زخرفةٌ خالصة.** الطبقة `aria-hidden`، والعلامات الثابتة في التخطيط
 * هي الأصل: لو لم يعمل هذا المكوّن إطلاقًا — بلا JS، أو تقليل حركة، أو لقطة
 * شاشة — بقي الشعار وعلامات الصفوف مرسومةً كما هي. لا يُخفى محتوًى بانتظار
 * حركة.
 *
 * ⚠️ **المراسي تُقرأ حيّةً كل إطار.** مرساة الواجهة داخل مسرحٍ ملتصق، فموضعها
 * في المستند يتغيّر مع التمرير بينما موضعها في الشاشة ثابت. قياسها مرّةً عند
 * التحميل يجعل الشعار ينزلق بعيدًا عن مكانه.
 *
 * ⚠️ **إحداثيات فيزيائية لا منطقية.** الطبقة `dir="ltr"` وتُموضَع بـ
 * `left/top`؛ الحساب يأتي من `rect.left`. استعمال `inset-inline-start` هنا
 * أزاح كل شيء بعرض الشاشة في أول بناء — لأنها تعني «اليمين» في RTL.
 *
 * ⚠️ **صفحةٌ ناقصة إحدى المرساتين تُخفي الطبقة كاملةً، لا ترسم عطلًا.**
 * `[data-mark-anchor="hero"]` و`[data-mark-anchor="rest"]` كلاهما لازم؛
 * بلا أحدهما تُخفى الطبقة (`visibility:hidden`) وتُزال `mark-morphing` عن
 * `<html>` فتبقى العلامات الثابتة ظاهرة — بدل ترك الأضلاع الستّة مبنيّة
 * بلا `transform`، فترتسم بأبعادها الخام (حتى 812×1016px) في زاوية الشاشة.
 * القرار يُعاد كل استدعاءٍ لـ`place()` فيتعافى تلقائيًا حين تكتمل المرساتان.
 */

const VIEWBOX_W = 2701;

/* الصناديق تأتي من `@/lib/mark-boxes` — مصدرٌ مشتركٌ مع `project-index.tsx`
   بدل حسابٍ محلّي مكرَّر (انظر تعليق ذلك الملف). */
const BOXES = MARK_BOXES;

const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** تسارعٌ ثم تباطؤ — يجعل الانتقال يبدأ ويستقرّ بهدوء */
const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export function MarkMorph() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    let shards: HTMLElement[] = [];
    let frame = 0;
    let live = false;

    const place = () => {
      frame = 0;
      const hero = document.querySelector<HTMLElement>('[data-mark-anchor="hero"]');
      /* ⚠️ **`rest` لا `foot`.** كان الاجتماع في التذييل، ونُقل إلى قسم
         «الأسئلة الشائعة» بطلبٍ صريح (حسام، ٧ أغسطس ٢٠٢٦) وحُذف شعار
         التذييل. والاسم `rest` (مستقرّ الرحلة) لا `faq` عمدًا: الموضع قد
         ينتقل ثانيةً، والمرساة تصف **دورها** لا القسم الذي تسكنه اليوم. */
      const rest = document.querySelector<HTMLElement>('[data-mark-anchor="rest"]');
      const foot = document.querySelector<HTMLElement>('[data-mark-anchor="foot"]');
      /* المراسي مفهرسةٌ برقم الضلع لا بترتيب DOM: التوزيع في الوثيقة §٤
         يجري بالنسبة (ثلاثة أضلاعٍ متطابقة النسبة لبطاقات الركائز) لا
         بترتيب التمرير، فقراءةٌ بالترتيب تُسند الضلع الخطأ للهدف الخطأ. */
      const docks = new Map<number, DOMRect>();
      document
        .querySelectorAll<HTMLElement>("[data-mark-dock]")
        .forEach((el) => {
          const i = Number(el.dataset.markDock);
          if (Number.isInteger(i) && i >= 0 && i < BOXES.length) {
            docks.set(i, el.getBoundingClientRect());
          }
        });

      /* ⚠️ **صفحةٌ ناقصة إحدى المرساتين تُخفي الطبقة كاملةً — لا ترسم
         أضلاعًا بأبعادها الخام عند (0,0).** كل صفحةٍ داخلية اليوم (اللجان
         والمشاريع والمقالات...) بلا أي مرساة، وكذا الرئيسية قبل اكتمال
         مرساة التذييل. `build()` أنشأت الأضلاع بلا شرط، فبقاؤها بلا
         `transform` يُظهرها بعرضها/ارتفاعها الخام (حتى 812×1016px) في زاوية
         الشاشة — كتلةٌ مموّهة تحجب المحتوى، لا تدهورًا آمنًا. الإخفاء هنا
         مرتبطٌ بنتيجة كل استدعاء (لا مرّةً عند البناء) فيتعافى تلقائيًا في
         اللحظة التي تكتمل فيها المرساتان، ويُخفي الطبقة من جديد لو غابت
         إحداهما لاحقًا. */
      if (!hero || !rest) {
        host.style.visibility = "hidden";
        document.documentElement.classList.remove("mark-morphing");
        return;
      }
      host.style.visibility = "";
      document.documentElement.classList.add("mark-morphing");

      const a = hero.getBoundingClientRect();
      const f = rest.getBoundingClientRect();
      const kHero = a.width / VIEWBOX_W;
      const kRest = f.width / VIEWBOX_W;

      /* ⚠️ مرحلة الصفوف تعمل عند ستّة صفوف بالضبط لا غير. الأعداد تتغيّر كل
         ترم، وتطابقٌ نصفيّ يُقرأ عطلًا — فتُعطَّل المرحلة كلّها وتذهب العلامة
         من الواجهة إلى التذييل مباشرةً، والعلامات الثابتة تبقى في مكانها. */
      /* ⚠️ نفس قاعدة العدد القديمة: مرحلة الأقسام تعمل عند اكتمال المراسي
         الستّة لا غير. اكتمالٌ نصفيّ يُقرأ عطلًا، فتُعطَّل المرحلة كلّها
         وتذهب العلامة من الواجهة إلى التذييل مباشرةً. */
      const docksUsable = docks.size === BOXES.length;

      /* خطٌّ لكل ضلع: يبدأ حين تدخل حافّة مرساه العليا الشاشة، ويتشبّع عند
         `innerHeight × 0.5` — نفس عتبة `t1` القديمة، مطبَّقةً على كلٍّ وحده. */
      const tDock = BOXES.map((_, i) => {
        const r = docksUsable ? docks.get(i) : undefined;
        return r
          ? ease(clamp((window.innerHeight - r.top) / (window.innerHeight * 0.5)))
          : 0;
      });

      /* ⚠️ **`t2` من موضع مرساة الاستقرار على الشاشة — لا من قاع الصفحة.**
         كانت الصيغة تقود التقدّم بما تبقّى من التمرير حتى نهاية المستند،
         لأن الاجتماع كان في **التذييل**: مرساةٌ في آخر المستند تكتمل عند
         القاع بالضبط، وهو المرجع الوحيد الذي كان يصحّ هناك.

         وقد انتقل الاجتماع إلى قسم «الأسئلة الشائعة» — وبينه وبين القاع
         تذييلٌ كامل. فالصيغة القديمة تعني ألّا تكتمل العلامة إلا وقد صار
         القسم كلّه خلف الشاشة: تجتمع حيث لا يراها أحد.

         فالمرجع الآن موضعُ المرساة نفسها، **بالصيغة التي ترسو بها الأضلاع
         على مراسيها** (`tDock`) حرفًا بحرف — فيتّحد إحساس المرحلتين. وعلّةُ
         الصيغة القديمة (ألّا ترتفع مرساةُ التذييل كفايةً على شاشةٍ ضيّقة)
         لا تنطبق هنا: تحت القسم تذييلٌ طويل، فتبلغ المرساة نصف الشاشة
         الأعلى دائمًا. وهذا مقيسٌ لا مُقدَّر — انظر تقرير الفحص. */
      const restRect = rest.getBoundingClientRect();
      /* لا يبدأ الاجتماع حتى يرسو **آخر** ضلع — وإلا انطلق المتقدّمون نحو
         المستقرّ بينما لم يبلغ المتأخّرون مراسيهم، فتُقرأ الحركة تشتّتًا. */
      const allDocked = !docksUsable || tDock.every((t) => t >= 1);
      const t2 = allDocked
        ? ease(clamp((window.innerHeight - restRect.top) / (window.innerHeight * 0.5)))
        : 0;

      /* ══ المرحلة الثالثة: من مستقرّ الأسئلة إلى توقيع التذييل ══
         ⚠️ **بلا هذه المرحلة تقف الرحلة عند 72% من الصفحة.** جُرِّبت
         محطّتان فقط (واجهة ← أقسام ← أسئلة) فبان الأثر مقيسًا: عند 90% من
         التمرير ثلاثةُ أضلاعٍ على الشاشة، وعند 100% **صفر** — لأن المجتمعة
         ملتصقةٌ بمرساةٍ أعلى فتنزلق معها. فيُقرأ آخر ربع الصفحة ساكنًا،
         والحكم: «ليش ما عاد يتحرّك من فوق لتحت؟». والرحلة الكاملة هي
         المقصودة أصلًا: «التشكّل قوّة هذا الموقع».

         و`t3` تُقاد بما تبقّى من التمرير حتى نهاية المستند لا بموضع مرساة
         التذييل — وهي الصيغة التي كانت تصحّ حين كان الاجتماع في التذييل،
         وتصحّ هنا للسبب نفسه: مرساةٌ في آخر المستند تكتمل عند القاع بالضبط
         مهما ضاق العرض. (موضعُ المرساة يفشل هناك: ارتفاعها مقفولٌ بنسبة
         الشعار، فعلى عرضٍ ضيّق لا يبلغ القاعُ عتبةَ التشبّع — مقيسٌ سابقًا:
         385.6 عند 768، و1793.6 عند 320.)

         ولا تبدأ حتى يكتمل الاجتماع عند الأسئلة (`t2 >= 1`)، وإلّا انسحب
         الشعار من مستقرّه قبل أن يجتمع فيه فتضيع المحطّة الوسطى. */
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const remaining = maxScroll - window.scrollY;

      /* ⚠️ **المضمار محسوبٌ لا ثابت — وإلا انفتحت فجوةٌ تختفي فيها العلامة.**
         جُرِّب مضمارٌ ثابت (`innerHeight × 0.42`) كما كان أيام المحطّتين،
         فبدأت المرحلة الثالثة في آخر أربعة أعشار شاشةٍ فقط: تكتمل المحطّة
         الوسطى عند 64% من التمرير ثم تبقى العلامة ملتصقةً بمرساةٍ تنزلق
         فوق الشاشة، فتغيب. مقيسًا: عند 80% ثلاثةُ أضلاعٍ مرئيّة، وعند 90%
         **صفر**، ثم تعود ستّةً عند 100% — قفزةٌ لا رحلة.

         فالمضمار الآن هو **المسافة الفعليّة** بين اللحظة التي تكتمل فيها
         المحطّة الوسطى وقاع الصفحة: تكتمل حين تبلغ حافّةُ مرساة الاستقرار
         العليا نصفَ الشاشة، أي عند `restDocTop − innerHeight/2`. فتبدأ
         المرحلة الثالثة من حيث انتهت الثانية بالضبط، وتنتهي عند القاع
         بالضبط — انتقالٌ متّصلٌ بلا فجوة، ويتكيّف مع أي ارتفاع فتحةٍ أو طول
         تذييلٍ وحده بلا رقمٍ يُضبط بيد. */
      const restDocTop = restRect.top + window.scrollY;
      const runway = Math.max(1, maxScroll - (restDocTop - window.innerHeight / 2));
      /* ⚠️ **خطّيّة لا مُسهَّلة — وحدها من بين المراحل الثلاث.**
         `ease` مكعّبةٌ بطيئةُ البداية: عند ثلث المضمار تكون قد قطعت ١٠٪ من
         المسافة فقط. وهنا **المرساة المغادَرة تصعد مع التمرير**، فبينما
         العلامة متباطئةٌ في الانطلاق تنزلق مرساتُها فوق الشاشة وتأخذها
         معها. مقيسًا على 390×844: غيابٌ تامّ بين 87% و97% من التمرير.
         والخطّيّة تجعل التقدّم مساويًا لما قطعه التمرير، فتبقى العلامة
         داخل الفتحة طوال الساق. والمرحلتان السابقتان مُسهَّلتان لأن
         مرساتيهما تدخلان الشاشة ولا تغادرانها. */
      const t3 = foot && t2 >= 1 ? clamp(1 - remaining / runway) : 0;
      const g = foot?.getBoundingClientRect();
      const kFoot = g ? g.width / VIEWBOX_W : 0;

      /* ⚠️ **الضلع لا يطير مرئيًّا.** مقيسًا قبل هذه البوّابة: 37.9% من
         عنوان «من نحن؟» مغطّى على 390، و9.8% على 1280 — والفارق ليس
         عشوائيًّا: الضلع يبقى بحجمه بينما يضيق النصّ، فيتفاقم العطل على
         الجوّال. أمّا الساكن في مرساه فبريء (3.2%، ومصدره ملامسةُ الضلع 3
         للنصّ الذي هو جزءٌ منه أصلًا).
         فيُطفأ الضلع في وسط رحلته ويُضاء عند طرفيها. العتامة مسموحةٌ في
         قيد الحركة (transform/opacity/clip-path) فلا تخالف §11. */
      const FLAT = 0.85; // نصف عرض هضبة الإخفاء — انظر ملاحظة الضبط أدناه
      const fade = (t: number) =>
        clamp((Math.abs(2 * t - 1) - FLAT) / (1 - FLAT));

      shards.forEach((shard, i) => {
        const b = BOXES[i];
        const ax = a.left + b.x * kHero;
        const ay = a.top + b.y * kHero;
        const aw = b.w * kHero;
        const ah = b.h * kHero;
        const cx = f.left + b.x * kRest;
        const cy = f.top + b.y * kRest;
        const cw = b.w * kRest;
        const ch = b.h * kRest;
        const s = docksUsable ? docks.get(i) : undefined;
        const t1i = tDock[i];

        /* ثلاث مزجاتٍ متتابعة: مرسى ← مستقرّ الأسئلة ← توقيع التذييل. */
        const x2 = mix(s ? mix(ax, s.left, t1i) : ax, cx, t2);
        const y2 = mix(s ? mix(ay, s.top, t1i) : ay, cy, t2);
        const w2 = mix(s ? mix(aw, s.width, t1i) : aw, cw, t2);
        const h2 = mix(s ? mix(ah, s.height, t1i) : ah, ch, t2);

        const x = g ? mix(x2, g.left + b.x * kFoot, t3) : x2;
        const y = g ? mix(y2, g.top + b.y * kFoot, t3) : y2;
        const w = g ? mix(w2, b.w * kFoot, t3) : w2;
        const h = g ? mix(h2, b.h * kFoot, t3) : h2;

        shard.style.transform = `translate3d(${x}px,${y}px,0) scale(${w / b.w},${h / b.h})`;
        /* الرحلة النشطة: آخرُ مرحلةٍ متحرّكة هي التي تحكم الإطفاء —
           التذييل إن بدأت، فالمستقرّ، فالمرسى. */
        shard.style.opacity = String(fade(t3 > 0 ? t3 : t2 > 0 ? t2 : t1i));
      });
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(place);
    };

    const build = () => {
      host.textContent = "";
      shards = BOXES.map((b, i) => {
        const d = document.createElement("div");
        d.dataset.markShard = String(i);
        d.style.cssText =
          `position:absolute;top:0;left:0;transform-origin:0 0;will-change:transform,opacity;` +
          `width:${b.w}px;height:${b.h}px`;
        d.innerHTML =
          `<svg viewBox="${b.x} ${b.y} ${b.w} ${b.h}" fill="currentColor" focusable="false"` +
          ` style="display:block;width:100%;height:100%">` +
          `<polygon points="${MARK_POINTS[i]}"/></svg>`;
        host.appendChild(d);
        return d;
      });
      /* تُنشر للحصّالة وحدها (`__audit.docks`) — القياس يحتاج نِسَب الأضلاع
         الحقيقية، ولا مصدر لها في DOM. لا يقرؤها كودُ المنتج. */
      (window as unknown as { __MARK_BOXES?: readonly MarkBox[] }).__MARK_BOXES =
        BOXES;
    };

    const teardown = () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      host.textContent = "";
      shards = [];
      delete (window as unknown as { __MARK_BOXES?: readonly MarkBox[] })
        .__MARK_BOXES;
      host.style.visibility = "";
      document.documentElement.classList.remove("mark-morphing");
      live = false;
    };

    const decide = () => {
      if (calm.matches) {
        if (live) teardown();
        return;
      }
      if (live) return;
      live = true;
      /* `mark-morphing` وإظهار الطبقة يُقرَّران داخل place() نفسها —
         مرتبطان بوجود المرساتين فعليًا لا بمجرّد قرار "تشغيل" المكوّن. */
      build();
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
      place();
      /* الخطوط تغيّر ارتفاع الصفوف فتنتقل الخانات — يُعاد الحساب بعد جهوزها */
      document.fonts?.ready.then(place);
    };

    calm.addEventListener("change", decide);
    decide();

    return () => {
      calm.removeEventListener("change", decide);
      teardown();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      data-mark-layer=""
      aria-hidden
      dir="ltr"
      className="pointer-events-none fixed inset-0 z-[1] text-mark-quiet"
    />
  );
}
