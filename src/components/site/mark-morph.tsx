"use client";

import { useEffect, useRef } from "react";

import { MARK_POINTS } from "@/lib/geometry.generated";

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

/** الصندوق المحيط بضلعٍ داخل `viewBox` الشعار */
type Box = { x: number; y: number; w: number; h: number };

const VIEWBOX_W = 2701;

const BOXES: readonly Box[] = MARK_POINTS.map((points) => {
  const pairs = points.split(" ").map((pair) => pair.split(",").map(Number));
  const xs = pairs.map(([x]) => x);
  const ys = pairs.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
});

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
      const slots = Array.from(document.querySelectorAll<HTMLElement>("[data-mark-slot]"));

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
      const rowsUsable = slots.length === MARK_POINTS.length;
      const rects = rowsUsable ? slots.map((s) => s.getBoundingClientRect()) : null;

      const t1 = rects ? ease(clamp((window.innerHeight - rects[0].top) / (window.innerHeight * 0.5))) : 0;
      const t2 =
        t1 < 1 && rects
          ? 0
          : ease(clamp((window.innerHeight - f.top) / (window.innerHeight * 0.42)));

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
        const s = rects?.[i];

        const x = mix(s ? mix(ax, s.left, t1) : ax, cx, t2);
        const y = mix(s ? mix(ay, s.top, t1) : ay, cy, t2);
        const w = mix(s ? mix(aw, s.width, t1) : aw, cw, t2);
        const h = mix(s ? mix(ah, s.height, t1) : ah, ch, t2);

        shard.style.transform = `translate3d(${x}px,${y}px,0) scale(${w / b.w},${h / b.h})`;
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
          `position:absolute;top:0;left:0;transform-origin:0 0;will-change:transform;` +
          `width:${b.w}px;height:${b.h}px`;
        d.innerHTML =
          `<svg viewBox="${b.x} ${b.y} ${b.w} ${b.h}" fill="currentColor" focusable="false"` +
          ` style="display:block;width:100%;height:100%">` +
          `<polygon points="${MARK_POINTS[i]}"/></svg>`;
        host.appendChild(d);
        return d;
      });
    };

    const teardown = () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      host.textContent = "";
      shards = [];
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
      className="pointer-events-none fixed inset-0 z-[1] text-surface-floor"
    />
  );
}
