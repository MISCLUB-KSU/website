"use client";

import { useEffect, useRef } from "react";

import { MARK_POINTS } from "@/lib/geometry.generated";
import { MARK_BOXES, type MarkBox } from "@/lib/mark-boxes";

/**
 * العلامة تتشكّل مع التمرير.
 *
 * ستّة أضلاع الشعار تنتقل بين ثلاث حالات:
 *   أ) مجتمعةً شعارًا في الواجهة   — `[data-mark-anchor="hero"]`
 *   ب) متفرّقةً على صفوف المشاريع  — `[data-mark-slot]` × ٦
 *   ج) مجتمعةً شعارًا في التذييل   — `[data-mark-anchor="foot"]`
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
 * `[data-mark-anchor="hero"]` و`[data-mark-anchor="foot"]` كلاهما لازم؛
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
      if (!hero || !foot) {
        host.style.visibility = "hidden";
        document.documentElement.classList.remove("mark-morphing");
        return;
      }
      host.style.visibility = "";
      document.documentElement.classList.add("mark-morphing");

      const a = hero.getBoundingClientRect();
      const f = foot.getBoundingClientRect();
      const kHero = a.width / VIEWBOX_W;
      const kFoot = f.width / VIEWBOX_W;

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

      /* ⚠️ **`t2` من المسافة المتبقّية حتى قاع الصفحة، لا من موضع المرساة.**
         الصيغة القديمة (`innerHeight - f.top`) تشترط أن ترتفع حافّة مرساة
         التذييل العلوية إلى نحو `innerHeight × 0.58` لتتشبّع — وارتفاع
         تلك المرساة مقفولٌ بنسبة الشعار (2701:1016)، فعلى عرضٍ ضيّق يكون
         التذييل نفسه قصيرًا فلا يبلغ قاع الصفحة تلك النقطة إطلاقًا:
         t2 تتوقّف عند ~0.5 والعلامة لا تكتمل أبدًا (مقيسٌ: vsFoot 385.6
         عند 768×1024، و1793.6 عند 320×568 — بينما 1280×800 وحدها تصل 0،
         لأن تذييلها أطول من `innerHeight×0.42` هناك بمحض الصدفة).

         العلاج: يقود التقدّمَ ما تبقّى من التمرير الفعلي حتى `maxScroll`
         (نهاية المستند)، لا موضعَ المرساة على الشاشة. حين `remaining=0`
         فـ`t2=ease(1)=1` **دائمًا**، مهما كان عرض الفتحة أو طول التذييل —
         الاجتماع يكتمل عند القاع بالضبط في كل مرّة. طول المضمار
         (`innerHeight × 0.42`) بقي كما كان: نفس الإحساس بالسرعة، تغيّر
         المرجع فقط لا مدّة الانتقال. */
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const remaining = maxScroll - window.scrollY;
      /* لا يبدأ الاجتماع حتى يرسو **آخر** ضلع — وإلا انطلق المتقدّمون نحو
         التذييل بينما لم يبلغ المتأخّرون مراسيهم، فتُقرأ الحركة تشتّتًا. */
      const allDocked = !docksUsable || tDock.every((t) => t >= 1);
      const t2 = allDocked
        ? ease(clamp(1 - remaining / (window.innerHeight * 0.42)))
        : 0;

      /* ⚠️ **الضلع لا يطير مرئيًّا.** مقيسًا قبل هذه البوّابة: 37.9% من
         عنوان «من نحن؟» مغطّى على 390، و9.8% على 1280 — والفارق ليس
         عشوائيًّا: الضلع يبقى بحجمه بينما يضيق النصّ، فيتفاقم العطل على
         الجوّال. أمّا الساكن في مرساه فبريء (3.2%، ومصدره ملامسةُ الضلع 3
         للنصّ الذي هو جزءٌ منه أصلًا).
         فيُطفأ الضلع في وسط رحلته ويُضاء عند طرفيها. العتامة مسموحةٌ في
         قيد الحركة (transform/opacity/clip-path) فلا تخالف §11. */
      const FLAT = 0.6; // نصف عرض هضبة الإخفاء — انظر ملاحظة الضبط أدناه
      const fade = (t: number) =>
        clamp((Math.abs(2 * t - 1) - FLAT) / (1 - FLAT));

      shards.forEach((shard, i) => {
        const b = BOXES[i];
        const ax = a.left + b.x * kHero;
        const ay = a.top + b.y * kHero;
        const aw = b.w * kHero;
        const ah = b.h * kHero;
        const cx = f.left + b.x * kFoot;
        const cy = f.top + b.y * kFoot;
        const cw = b.w * kFoot;
        const ch = b.h * kFoot;
        const s = docksUsable ? docks.get(i) : undefined;
        const t1i = tDock[i];

        const x = mix(s ? mix(ax, s.left, t1i) : ax, cx, t2);
        const y = mix(s ? mix(ay, s.top, t1i) : ay, cy, t2);
        const w = mix(s ? mix(aw, s.width, t1i) : aw, cw, t2);
        const h = mix(s ? mix(ah, s.height, t1i) : ah, ch, t2);

        shard.style.transform = `translate3d(${x}px,${y}px,0) scale(${w / b.w},${h / b.h})`;
        /* الرحلة النشطة: نحو التذييل إن بدأ الاجتماع، وإلّا نحو المرسى. */
        shard.style.opacity = String(fade(t2 > 0 ? t2 : t1i));
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
