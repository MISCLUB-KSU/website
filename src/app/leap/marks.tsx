import { MARK_POINTS, MARK_VIEWBOX } from "@/lib/geometry.generated";

/**
 * تدرّجُ LEAP الرسميّ — سبعُ محطّاتٍ منقولةٌ حرفيًّا من ملفّ شعارهم
 * (`LEAP_Gradient` في `public/leap/leap-logo.svg`).
 *
 * ⚠️ **هذي المحطّاتُ لا تُقرَّب ولا تُبسَّط.** نسخةُ الـCSS في موقعهم ثلاثُ
 * محطّاتٍ فقط، وهي تقريبٌ لهذي. المحطّاتُ السبعُ تحمل المنحنى الحقيقيّ:
 * ماجنتا تنطفئ في بنفسجيّ ثم كحليّ ثم تنفتح على سماويّ. تبسيطُها يجعل
 * الوسطَ أفتحَ مما ينبغي فتُقرأ العلامةُ «تدرّجًا بنفسجيًّا عامًّا» —
 * وهذا بالضبط ما نتجنّبه.
 */
export const LEAP_RAMP = [
  { at: "0", color: "#eb3df7" },
  { at: "0.06", color: "#e13bf2" },
  { at: "0.16", color: "#c839e7" },
  { at: "0.30", color: "#9e34d6" },
  { at: "0.45", color: "#652dbd" },
  { at: "0.55", color: "#3b29ab" },
  { at: "0.99", color: "#73fafd" },
] as const;

/**
 * نسخةُ الأرضياتِ الفاتحة — بلا الطرف السماويّ.
 *
 * ⚠️ **`#73fafd` على أبيضَ يقارب 1.4:1.** السلّمُ الكاملُ مصمَّمٌ لأرضيةٍ
 * داكنة، وعلى بطاقةٍ بيضاءَ يذوب طرفُه السماويُّ فتبدو العلامةُ ناقصةَ
 * ضلعٍ أو ضلعين. فتُقصَر على الطرف الداكن: ماجنتا فبنفسجيٌّ فكحليّ.
 */
const LEAP_RAMP_ON_LIGHT = [
  { at: "0", color: "#eb3df7" },
  { at: "0.22", color: "#c839e7" },
  { at: "0.46", color: "#9e34d6" },
  { at: "0.72", color: "#652dbd" },
  { at: "1", color: "#2f2192" },
] as const;

type ClubMarkProps = {
  className?: string;
  /** مُعرِّفٌ فريدٌ للتدرّج — نسختان في صفحةٍ واحدةٍ تتنازعان المُعرِّف */
  id: string;
  /** `onLight` تُسقط الطرفَ السماويَّ ليبقى مقروءًا على أرضيةٍ بيضاء */
  variant?: "full" | "onLight";
};

/**
 * علامةُ النادي بألوان LEAP.
 *
 * العلامةُ ستّةُ متوازياتٍ مائلة، وتدرّجُ LEAP يعبرها من أسفلِ اليمين إلى
 * أعلى اليسار — أي في اتجاه القراءة العربية. فالعلامةُ نفسُها تصير الجسرَ
 * بين الهويّتين: شكلُها شكلُنا، ولونُها لونُهم. وهذا أوضحُ من أي عنصرِ
 * وصلٍ مضاف.
 */
export function ClubMark({ className, id, variant = "full" }: ClubMarkProps) {
  const ramp = variant === "onLight" ? LEAP_RAMP_ON_LIGHT : LEAP_RAMP;
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      className={className}
      role="img"
      aria-label="نادي نظم المعلومات الإدارية"
    >
      <defs>
        {/* ⚠️ **أفقيٌّ لا قُطريّ.** العلامةُ عريضةٌ قصيرة (٢٫٦٦:١)، والقُطرُ
            عليها قصيرٌ فيبتلع طرفَي السلّم: ظهرت بنفسجيّةً كلُّها بلا
            ماجنتا ولا سماويّ — أي «تدرّجٌ بنفسجيٌّ عامّ»، وهو ما نتجنّبه.
            والاتجاهُ من اليمين إلى اليسار: اتجاهُ القراءة العربية.
            `objectBoundingBox` هي الافتراضية، فيتمدّد التدرّجُ مع أي مقاس. */}
        <linearGradient id={id} x1="1" y1="0" x2="0" y2="0">
          {ramp.map((stop) => (
            <stop key={stop.at} offset={stop.at} stopColor={stop.color} />
          ))}
        </linearGradient>
      </defs>
      {MARK_POINTS.map((points) => (
        <polygon key={points} points={points} fill={`url(#${id})`} />
      ))}
    </svg>
  );
}

/**
 * شعارُ LEAP — ملفُّهم الرسميُّ كما هو.
 *
 * ⚠️ **لا يُعاد تلوينُه ولا يُقلَب ولا تُغيَّر نسبتُه.** النسخةُ المستعملة
 * هي «on colour»: حروفُها بيضاءُ ومعالمُها بتدرّجهم، ومصمَّمةٌ لأرضيةٍ
 * داكنةٍ — وهي أرضيةُ هذي الصفحة. المعدَّلُ الوحيدُ في الملفّ `viewBox`:
 * قُصَّت هوامشُه الفارغة (كان المحتوى ٨٩٪ من العرض في لوحةٍ ١٩٢٠×١٠٨٠)،
 * والتدرّجاتُ `userSpaceOnUse` فلا يمسّها القصّ.
 */
export function LeapLogo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={className}
      src="/leap/leap-logo.svg"
      alt="LEAP"
      width={1720}
      height={975}
      decoding="async"
    />
  );
}

/**
 * القِرانُ بين العلامتين.
 *
 * الفاصلُ ميلانُ النادي نفسُه (`skewX`) لا شرطةً محايدة — فحتى أداةُ الفصل
 * تنتمي إلى لغةٍ واحدة.
 */
export function Lockup() {
  return (
    <div className="leap-lockup">
      <ClubMark className="leap-lockup-club" id="leapRampLockup" />
      <span className="leap-lockup-x" aria-hidden />
      <LeapLogo className="leap-lockup-leap" />
    </div>
  );
}
