"use client";

import { useEffect, useRef } from "react";

import { Lanyard } from "./lanyard";
import { ClubMark, LeapLogo } from "./marks";

type BadgeProps = {
  nameAr: string;
  nameEn: string;
  reference: string;
  /** اكتملت الخانات الخمس — عندها تشتعل حلقةُ LEAP الدوّارة */
  complete: boolean;
};

const DASH = "— — — —";

/**
 * البادج المعلَّق — الحبلُ والمشبكُ كما هما، والوجهُ «حقلٌ مائل».
 *
 * فكرةُ الوجه من هويّة النادي نفسِها: علامتُهم ستّةُ متوازياتٍ مائلةٍ
 * بزاوية 20°، و«الميلانُ توقيعٌ» قاعدةٌ مكتوبةٌ في نظامهم. فالبطاقةُ
 * تفجيرٌ لتلك العلامة: حقولٌ مائلةٌ بالزاوية نفسِها تعبر وجهًا حبريًّا —
 * أعرضُها يحمل تدرّجَ LEAP الرسميّ — ولوحُ الاسمِ نفسُه متوازي أضلاعٍ
 * (الحاويةُ تُمال والمحتوى يُعدَّل، نفسُ بناءِ `.mis-slant` في الموقع).
 *
 * والتفاعلُ محسوسٌ هادئ: تلمسها **فتتمايل حول نقطة تعليقها** كبندولٍ
 * وتلتفّ نحوك قليلًا — بلا صفيحٍ ولا وهج. المعالجُ يكتب متغيّراتِ CSS
 * مباشرةً عبر `rAF`، فلا إعادةَ رندرٍ في أثناء الملاحقة.
 *
 * ⚠️ **ولا شيءَ يبدأ شفّافًا ولا مشروطًا بالجافاسكربت**: افتراضاتُ
 * المتغيّرات أصفارٌ، فبدونها يقف البادجُ ساكنًا كاملَ المحتوى.
 */
export function Badge({
  nameAr,
  nameEn,
  reference,
  complete,
}: BadgeProps) {
  const ar = nameAr.trim();
  const en = nameEn.trim();
  const ref = reference.trim().toUpperCase();

  const card = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const still = useRef(false);

  useEffect(() => {
    /* من طلب تقليلَ الحركة لا يُلاحَق مؤشّرُه — تُقرأ مرّةً وتُتابَع */
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      still.current = mq.matches;
    };
    sync();
    mq.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  const follow = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = card.current;
    if (!el || still.current) return;
    const box = el.getBoundingClientRect();
    const px = (event.clientX - box.left) / box.width;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      /* بطاقةٌ معلَّقة: تلتفّ حول محورها العموديّ نحو المؤشّر، وتتمايل
         حول نقطة التعليق تمايلَ بندولٍ خفيف — لا ميلَ أماميًّا حرًّا */
      el.style.setProperty("--ry", `${((px - 0.5) * -10).toFixed(2)}deg`);
      el.style.setProperty("--rz", `${((px - 0.5) * 4).toFixed(2)}deg`);
      el.classList.add("is-live");
    });
  };

  const rest = () => {
    const el = card.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    el.classList.remove("is-live");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--rz", "0deg");
  };

  return (
    <div
      ref={card}
      className="leap-rig"
      onPointerMove={follow}
      onPointerLeave={rest}
      onPointerCancel={rest}
    >
      {/* الحبل: شريطان منحنيان يلتقيان عند المشبك */}
      <Lanyard className="leap-lanyard" />

      <div className="leap-hang">
        <div className={`leap-shell${complete ? " is-complete" : ""}`}>
          <div className="leap-flip">
            {/* ============ الوجه الأمامي — الحقل المائل ============ */}
            <div className="leap-face leap-face-front">
              {/* الحقولُ المائلة — خلفيّةٌ صرفة، بزاوية علامة النادي */}
              <span className="leap-fx-band leap-fx-band-ramp" aria-hidden />
              <span className="leap-fx-band leap-fx-band-line" aria-hidden />
              <span className="leap-fx-band leap-fx-band-dim" aria-hidden />

              <div className="leap-fx-top">
                <ClubMark className="leap-fx-mark" id="leapRampFx" />
                <LeapLogo className="leap-fx-leap" />
              </div>

              {/* لوحُ الاسم — متوازي أضلاعٍ ثلجيٌّ والمحتوى معدَّل */}
              <div className="leap-fx-nameplate">
                <div className="leap-fx-nameplate-in">
                  <span
                    className={ar ? "leap-fx-ar" : "leap-fx-ar leap-fx-ph"}
                  >
                    {ar || "اسمك بالعربي"}
                  </span>
                  <span
                    className={
                      en
                        ? "leap-fx-en leap-lat"
                        : "leap-fx-en leap-lat leap-fx-ph"
                    }
                    dir="ltr"
                    lang="en"
                  >
                    {en || "YOUR NAME"}
                  </span>
                </div>
              </div>

              {/* لوحُ رقم الحجز — متوازٍ حبريٌّ يحمل مفتاح التذكرة */}
              <div className="leap-fx-seqplate">
                <div className="leap-fx-seqplate-in">
                  <span className="leap-fx-seqlabel leap-lat" dir="ltr" lang="en">
                    SEQ
                  </span>
                  <span
                    className={
                      ref ? "leap-fx-seq leap-lat" : "leap-fx-seq leap-lat leap-ph"
                    }
                    dir="ltr"
                    lang="en"
                  >
                    {ref || DASH}
                  </span>
                </div>
              </div>

              <div className="leap-fx-foot">
                <span className="leap-fx-org">
                  نادي نظم المعلومات الإدارية — جامعة الملك سعود
                </span>
                <span className="leap-fx-event leap-lat" dir="ltr" lang="en">
                  31 AUG — 03 SEP 2026 · RECC MALHAM · RIYADH
                </span>
              </div>
            </div>

          </div>

          {/* الفتحةُ المثقوبة — على الغلاف لا على وجهٍ بعينه: الثقبُ في
              جسم البطاقة فيبقى أثناء القلب. وداخلَها مقطعُ السلك الغاطس:
              المسارُ الأماميُّ في `lanyard.tsx` ينتهي هنا، وهذا استمرارُه
              خلف مستوى الوجه — كرومٌ مظلَّلٌ بلا سبكولار (في الظلّ)،
              يُقصّ على حدود الفتحة فيُقرأ السلكُ عابرًا إلى الخلف. */}
          <span className="leap-slot" aria-hidden>
            <svg viewBox="0 0 56 26" focusable="false">
              <defs>
                <linearGradient id="leapSlotWire" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#34343e" />
                  <stop offset="0.5" stopColor="#6c6c79" />
                  <stop offset="1" stopColor="#43434d" />
                </linearGradient>
              </defs>
              <line
                x1="33"
                y1="13"
                x2="3"
                y2="4"
                stroke="#0a0810"
                strokeWidth="12"
                strokeLinecap="round"
              />
              <line
                x1="33"
                y1="13"
                x2="3"
                y2="4"
                stroke="url(#leapSlotWire)"
                strokeWidth="9"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}
