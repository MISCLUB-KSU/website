"use client";

import { useEffect, useRef, useState } from "react";

import {
  FIELD_MARK_POINTS,
  FIELD_STROKES,
  FIELD_VIEWBOX,
} from "@/lib/geometry.generated";

/**
 * الحقل المائل — تفاعليًّا.
 *
 * التوقيع البصري نفسه (ضربات ٢٤° والعلامة محفورة فراغًا سالبًا)، لكنه
 * هنا **يُشغَّل باليد**: الضربات تنفرج تحت المؤشّر وتعود حين يبتعد، وتنزاح
 * انزياحًا ثانيًا مع التمرير فيتنفّس الحقل كلّه.
 *
 * قوّتان تتراكبان على كل ضربة:
 *   المؤشّر — دفعٌ موضعيّ يقوى بالقرب ويتلاشى عند حدّ التأثير.
 *   التمرير — انزياحٌ عامّ، عمقه يتناوب بين الضربات فتتباعد لا تنزلق معًا.
 *
 * ⚠️ **لا يُخفى محتوًى بانتظار تفاعل.** الحقل زخرفةٌ خالصة (`aria-hidden`)،
 * والنصّ فوقه مرسومٌ كاملًا من أول إطار. لو لم يعمل هذا المكوّن إطلاقًا —
 * لسانٌ معطّل، أو تعذّر ترطيب، أو لقطة شاشة — بقيت الواجهة مقروءةً بحقلٍ
 * ساكن. الاستجابة إضافةٌ فوق الأصل لا شرطٌ له.
 *
 * ومن طلب تقليل الحركة يحصل على الحقل ساكنًا، ولا يُربط له مستمعٌ أصلًا.
 */

/**
 * مركز الضربة أفقيًّا — متوسّط سيني أركانها.
 *
 * يُحسب مرّةً خارج الرسم: الهندسة ثابتةٌ مولَّدة، فإعادة تحليل النصّ في كل
 * إطارٍ هدرٌ خالص.
 */
const centreX = (() => {
  const cache = new Map<string, number>();
  return (points: string): number => {
    const hit = cache.get(points);
    if (hit !== undefined) return hit;
    const xs = points.split(" ").map((pair) => Number(pair.split(",")[0]));
    const mid = xs.reduce((sum, x) => sum + x, 0) / xs.length;
    cache.set(points, mid);
    return mid;
  };
})();

/** أقصى دفعٍ من المؤشّر — بوحدات `viewBox` */
const POINTER_PUSH = 46;
/** نصف قطر تأثير المؤشّر، بنسبة قُطر الحقل */
const REACH = 0.34;
/** أقصى انزياحٍ من التمرير */
const SCROLL_DRIFT = 38;

export function HeroField() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [live, setLive] = useState(false);

  useEffect(() => {
    // من طلب تقليل الحركة: لا مستمع ولا حساب ولا إعادة رسم.
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const decide = () => setLive(!calm.matches);
    decide();
    calm.addEventListener("change", decide);
    return () => calm.removeEventListener("change", decide);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!live || !host) return;

    // ⚠️ **يُستمع على القسم لا على الحقل.** الحقل يجلس `-z-10` خلف النصّ،
    // فحدثُ المؤشّر يلتقطه النصُّ فوقه ولا يصل إليه أبدًا — جُرّب فتحرّكت
    // صفرُ ضربة. والقسم هو الحاوية التي يمرّ المؤشّر فوقها فعلًا، وقياس
    // النِّسب منه صحيحٌ لأنه يطابق الحقل في الأبعاد (`inset-0`).
    const surface = host.parentElement ?? host;

    let frame = 0;
    // القراءة داخل rAF: أحداث المؤشّر والتمرير تقع أسرع من الإطار،
    // فبلا تجميعٍ نحسب مرّاتٍ تُرمى نتائجها.
    const schedule = (work: () => void) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        work();
      });
    };

    const onMove = (event: PointerEvent) =>
      schedule(() => {
        const box = surface.getBoundingClientRect();
        setPointer({
          x: (event.clientX - box.left) / box.width,
          y: (event.clientY - box.top) / box.height,
        });
      });

    const onLeave = () => setPointer(null);

    const onScroll = () =>
      schedule(() => {
        const box = host.getBoundingClientRect();
        // 0 حين تملأ الواجهةُ الشاشة، 1 حين تغادرها تمامًا
        const seen = Math.min(1, Math.max(0, -box.top / (box.height || 1)));
        setProgress(seen);
      });

    surface.addEventListener("pointermove", onMove);
    surface.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      surface.removeEventListener("pointermove", onMove);
      surface.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [live]);

  const [vbW, vbH] = FIELD_VIEWBOX.split(" ").slice(2).map(Number);

  return (
    <div ref={hostRef} className="absolute inset-0 -z-10" aria-hidden>
      <svg
        viewBox={FIELD_VIEWBOX}
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
        focusable="false"
      >
        <defs>
          {/* التدرّج ليس زخرفة: بدونه يقفز سطوع الضربات تحت النصّ فيهبط
              التباين. مقيسٌ لا مقدَّر. */}
          <linearGradient id="hero-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.38" stopColor="#fff" />
            <stop offset="0.78" stopColor="#5a5a5a" />
            <stop offset="1" stopColor="#2a2a2a" />
          </linearGradient>
          <mask id="hero-void">
            <rect width="100%" height="100%" fill="url(#hero-fade)" />
            {FIELD_MARK_POINTS.map((points) => (
              <polygon key={points} points={points} fill="#000" />
            ))}
          </mask>
        </defs>

        {/* صفائح العلامة — أدكن من الأرضية فتُقرأ محفورة لا طافية */}
        {FIELD_MARK_POINTS.map((points) => (
          <polygon
            key={`plate-${points}`}
            points={points}
            fill="var(--ink-plate)"
          />
        ))}

        <g mask="url(#hero-void)">
          {FIELD_STROKES.map((stroke, index) => {
            // ⚠️ **المسافة أفقيّةٌ من مركز الضربة، لا من أوّل نقطةٍ فيها.**
            // الضربات متوازياتٌ طويلة تمتدّ خارج الإطار: أوّل نقطةٍ في
            // إحداها عند `-464` بينما مركزها عند `-239`. فقياس البُعد من
            // النقطة الأولى — ورأسيًّا معها — يُخرج كلَّ ضربةٍ تقريبًا عن
            // حدّ التأثير: تحرّكت أربعٌ من ثلاث وثلاثين، بإزاحةٍ لا تُرى.
            // ولأن الضربة تعبر الإطار من أعلاه إلى أسفله، فالبُعد الرأسيّ
            // لا معنى له — القرب أفقيٌّ وحده.
            const cx = centreX(stroke.points);

            let push = 0;
            if (pointer) {
              const dx = pointer.x - cx / vbW;
              const dist = Math.abs(dx);
              if (dist < REACH) {
                // القرب يدفع أقوى، والدفع يبتعد عن المؤشّر لا نحوه
                const force = (1 - dist / REACH) ** 2;
                push = -Math.sign(dx || 1) * force * POINTER_PUSH;
              }
            }

            // التناوب يمنع انزلاق الحقل ككتلةٍ واحدة
            const drift = progress * SCROLL_DRIFT * (index % 2 ? -1 : 1);

            return (
              <polygon
                key={`${stroke.points}-${index}`}
                points={stroke.points}
                fill="var(--sky)"
                opacity={stroke.opacity}
                style={{
                  transform: `translateX(${(push + drift).toFixed(2)}px)`,
                  transition: "transform 520ms cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />
            );
          })}
        </g>

        {/* خيط ضوء على حافّة الصفيحة — يُبقي العلامة مقروءة بلا رفع صوتها */}
        {FIELD_MARK_POINTS.map((points) => (
          <polygon
            key={`edge-${points}`}
            points={points}
            fill="none"
            stroke="var(--sky)"
            strokeOpacity="0.34"
            strokeWidth="1.6"
          />
        ))}
      </svg>
    </div>
  );
}
