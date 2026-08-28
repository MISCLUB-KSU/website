"use client";

import { useEffect, useRef, useState } from "react";

import { Mark } from "@/components/site/mark";

import { Lanyard } from "./lanyard";
import { ClubMark, LeapLogo } from "./marks";

type BadgeProps = {
  nameAr: string;
  nameEn: string;
  email: string;
  phone: string;
  reference: string;
  /** اكتملت الخانات الخمس — عندها تشتعل حلقةُ LEAP الدوّارة */
  complete: boolean;
};

const DASH = "— — — —";

/**
 * بطاقةُ اتصالٍ (vCard) من بيانات المسجِّل — تُشفَّر في الـQR على ظهر الكارد.
 *
 * الاسمُ فيها الإنجليزيُّ وحدَه: هو المطبوعُ على الكارد، وحقلُ `FN` تقرأه
 * دفاترُ العناوين لاتينيًّا. والاسمُ العربيُّ يظهر على وجه الحضور لا هنا.
 */
/** رقمٌ سعوديٌّ مكتمل: تسعُ خاناتٍ بعد إسقاط الصفر البادئ. */
function saudiDigits(phone: string): string {
  const n = phone.replace(/\D/g, "").replace(/^0/, "");
  return n.length === 9 ? n : "";
}

function vcard(en: string, phone: string, email: string): string {
  /* الناقصُ لا يُشفَّر: رقمٌ نصفُ مكتوبٍ في الـQR يعطي جهةَ اتصالٍ خاطئة */
  const digits = saudiDigits(phone);
  const tel = digits ? `TEL;TYPE=CELL:+966${digits}` : "";
  const mail = email ? `EMAIL:${email}` : "";
  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${en || "MIS Club Member"}`,
    "ORG:MIS Club — King Saud University",
    tel,
    mail,
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * جوّالٌ سعوديٌّ بصيغة الكارد المطبوع: ‏+966‏ ثم تسعُ خاناتٍ في ثلاثِ
 * مجموعات (‏5XX XXX XXX‏).
 *
 * ⚠️ **الناقصُ يُعرض خامًا بلا ‏+966‏.** المعاينةُ حيّةٌ أثناء الكتابة،
 * والتحقّقُ لا يجري إلّا عند الإرسال — فلو رُكّبت البادئةُ على ما لم يكتمل
 * ظهر على الكارد رقمٌ مشوّهٌ (‏+966 966512345678‏) يُقرأ صحيحًا وهو خطأ.
 */
function fmtPhone(phone: string): string {
  const digits = saudiDigits(phone);
  if (!digits) return phone.trim();
  return `+966 ${digits.replace(/^(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3")}`;
}

/**
 * البادج المعلَّق — الحبلُ والمشبكُ كما هما، وله وجهان يُقلَبان:
 *
 * **الأمامي «الحقل المائل»** — معاينةُ حضورٍ بهويّة LEAP: حقولٌ مائلةٌ
 * بزاوية علامة النادي تعبر حبرًا، وأعرضُها يحمل تدرّج LEAP.
 *
 * **الخلفيُّ بزنس كارد النادي الفعليّ** — التصميمُ الذي اعتمدته الإدارة:
 * أزرقُ على أبيض، علامةُ النادي، والاسمُ والتواصلُ و**QR حقيقيٌّ** يشفّر
 * بطاقةَ اتصال المسجِّل (vCard). فالمسجِّلُ يقلبها فيرى كارده كما سيُطبع —
 * بتصميمه الحقيقيّ لا بمعاينة الوجه الأمامي.
 *
 * ⚠️ **بيانات المسجِّل هو لا أحدٍ سواه**: الاسمُ والجوّالُ والبريدُ ما
 * كتبه هو في النموذج، في معاينةٍ في متصفّحه — لا بياناتِ طرفٍ ثالث.
 *
 * التفاعلُ: تلمسها فتتمايل بندولًا وتلتفّ نحوك، وزرٌّ يقلبها للكارد.
 * ولا شيءَ يبدأ شفّافًا: بلا جافاسكربت يقف البادجُ ساكنًا كاملَ المحتوى.
 */
export function Badge({
  nameAr,
  nameEn,
  email,
  phone,
  reference,
  complete,
}: BadgeProps) {
  const ar = nameAr.trim();
  const en = nameEn.trim();
  const mail = email.trim();
  const tel = phone.trim();
  const ref = reference.trim().toUpperCase();
  const hasContact = Boolean(en || tel || mail);

  const card = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const still = useRef(false);
  const turnTimer = useRef(0);
  /* «يدور الآن» — يعطّل ملاحقةَ المؤشّر كي لا يتراكب ميلُها على الدوران
     فيهتزّ. مرجعٌ لا حالة: لا شيءَ في الشجرة يُعاد رسمُه بسببه. */
  const turning = useRef(false);

  const [flipped, setFlipped] = useState(false);
  const [qr, setQr] = useState("");

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
      window.clearTimeout(turnTimer.current);
    };
  }, []);

  /* توليدُ الـQR على العميل عند تغيّر البيانات. `qrcode` تُحمَّل ديناميكيًّا
     فلا تُثقل الحزمةَ الأوّليّة، والـQR إثراءٌ لا شرطُ عرض (بلا جافاسكربت
     يبقى مكانُه نائبةً بصريّة). */
  useEffect(() => {
    /* لا نشفّر فراغًا: العرضُ يحرس على وجود البيانات، فلا حاجةَ لمسح الحالة
       متزامنًا هنا (يسبّب رندراتٍ متتالية). حين تفرغ الحقولُ يعود العرضُ
       إلى النائبة ولو بقيت قيمةٌ قديمة. */
    if (!hasContact) return;
    let alive = true;
    import("qrcode")
      .then((QR) =>
        QR.toDataURL(vcard(en, tel, mail), {
          margin: 0,
          width: 200,
          color: { dark: "#022d63", light: "#00000000" },
        }),
      )
      .then((url) => {
        if (alive) setQr(url);
      })
      .catch(() => {
        /* فشلُ التوليد لا يكسر البطاقة — تبقى النائبة */
      });
    return () => {
      alive = false;
    };
  }, [en, tel, mail, hasContact]);

  const follow = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = card.current;
    /* لا ملاحقةَ أثناء القلب: ميلُ الملاحقة فوق الدوران يجعله يهتزّ */
    if (!el || still.current || turning.current) return;
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

  /* ⚠️ **لا يُوقَف شيءٌ في أثناء القلب.** نسخةٌ سابقةٌ أوقفت التأرجحَ
     والحلقةَ الدوّارة «تخفيفًا» — فتجمّد المشهدُ كلُّه مدّةَ الدوران وقُرئ
     التجمّدُ نفسُه تعليقًا. والقياسُ (‏rAF deltas‏ أثناء القلب والحلقةُ
     شغّالة) لم يجد إطارًا واحدًا فوق 19ms — فالحركاتُ المحيطةُ رخيصةٌ
     وتبقى جارية. المؤقّتُ يعيد تسليحَ الملاحقة بعد هبوط الوجه (0.55s
     + هامش). */
  const toggleFlip = () => {
    turning.current = true;
    setFlipped((v) => !v);
    window.clearTimeout(turnTimer.current);
    turnTimer.current = window.setTimeout(() => {
      turning.current = false;
    }, 600);
  };

  return (
    <>
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
          <div
            className={`leap-shell${complete ? " is-complete" : ""}${
              flipped ? " is-open" : ""
            }`}
          >
            <div className={`leap-flip${flipped ? " is-flipped" : ""}`}>
              {/* ============ الوجه الأمامي — الحقل المائل ============ */}
              <div
                className="leap-face leap-face-front"
                aria-hidden={flipped}
                inert={flipped}
              >
                <span className="leap-fx-band leap-fx-band-ramp" aria-hidden />
                <span className="leap-fx-band leap-fx-band-line" aria-hidden />
                <span className="leap-fx-band leap-fx-band-dim" aria-hidden />

                <div className="leap-fx-top">
                  <ClubMark className="leap-fx-mark" id="leapRampFx" />
                  <LeapLogo className="leap-fx-leap" />
                </div>

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

                <div className="leap-fx-seqplate">
                  <div className="leap-fx-seqplate-in">
                    <span
                      className="leap-fx-seqlabel leap-lat"
                      dir="ltr"
                      lang="en"
                    >
                      SEQ
                    </span>
                    <span
                      className={
                        ref
                          ? "leap-fx-seq leap-lat"
                          : "leap-fx-seq leap-lat leap-ph"
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

              {/* ============ الوجه الخلفي — بزنس كارد النادي ============ */}
              <div
                className="leap-face leap-face-back"
                aria-hidden={!flipped}
                inert={!flipped}
              >
                {/* شريطُ العنوان — يوضّح أن ما خلف القلب معاينةٌ للبطاقة */}
                <span className="bizL-caption" dir="rtl" lang="ar">
                  معاينة بطاقتك للفعالية
                </span>

                {/* الكارد الأفقيُّ الحقيقيُّ — بترتيب الطباعة عينِه، وبنسبته
                    الصحيحة (700:400)، يتوسّط ظهرَ البادج على أرضيّةٍ كحليّة. */}
                <div className="bizL">
                  {/* متوازياتُ العلامة الباهتةُ أعلى اليمين، والشريطان
                      القطريّان الأزرقان أسفل — من التصميم المعتمد، خلف المحتوى. */}
                  <Mark className="bizL-deco-mark" decorative />
                  <span className="bizL-band bizL-band-light" aria-hidden />
                  <span className="bizL-band bizL-band-dark" aria-hidden />

                  <div className="bizL-head">
                    <Mark className="bizL-mark" decorative />
                    <span className="bizL-rule" aria-hidden />
                    <span className="bizL-wordmark leap-lat" dir="ltr" lang="en">
                      MANAGEMENT
                      <br />
                      INFORMATION
                      <br />
                      SYSTEM CLUB
                    </span>
                  </div>

                  <div className="bizL-id">
                    <span
                      className={
                        en ? "bizL-name leap-lat" : "bizL-name leap-lat bizL-ph"
                      }
                      dir="ltr"
                      lang="en"
                    >
                      {en || "Your Name"}
                    </span>
                    <span className="bizL-org leap-lat" dir="ltr" lang="en">
                      Management Information Systems Club
                    </span>
                  </div>

                  <dl className="bizL-contact">
                    <div>
                      {/* الأيقونةُ زخرفيّةٌ والتسميةُ نصٌّ مخفيٌّ بصريًّا: لولاه
                          سمع قارئُ الشاشة قيمةً بلا مصطلحٍ يعرّفها */}
                      <dt className="bizL-ic">
                        <span className="leap-sr">الجوال</span>
                        <svg viewBox="0 0 24 24" aria-hidden>
                          <path
                            fill="currentColor"
                            d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.3 1z"
                          />
                        </svg>
                      </dt>
                      <dd
                        className={tel ? "leap-lat" : "leap-lat bizL-ph"}
                        dir="ltr"
                        lang="en"
                      >
                        {tel ? fmtPhone(tel) : "+966 5XX XXX XXX"}
                      </dd>
                    </div>
                    <div>
                      <dt className="bizL-ic">
                        <span className="leap-sr">البريد</span>
                        <svg viewBox="0 0 24 24" aria-hidden>
                          <path
                            fill="currentColor"
                            d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm8 7L4 6.2V6l8 5 8-5v.2L12 11z"
                          />
                        </svg>
                      </dt>
                      <dd
                        className={mail ? "leap-lat" : "leap-lat bizL-ph"}
                        dir="ltr"
                        lang="en"
                      >
                        {mail || "you@misclubksu.com"}
                      </dd>
                    </div>
                  </dl>

                  <div className="bizL-qr" aria-hidden>
                    {qr && hasContact ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qr} alt="" width={62} height={62} />
                    ) : (
                      <span className="bizL-qr-ph" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* الفتحةُ المثقوبة — يبقى ثقبُها أثناء القلب. تعليلُها في `leap.css` */}
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

      {/* ضابطُ القلب — خارجَ الحاوية المائلة فلا يميل معها */}
      <button
        type="button"
        className="leap-flip-btn"
        onClick={toggleFlip}
        aria-pressed={flipped}
      >
        {flipped ? "ارجع لوجه الحضور" : "شوف البزنس كارد"}
      </button>
    </>
  );
}
