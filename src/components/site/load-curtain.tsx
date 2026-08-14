import { MARK_POINTS, MARK_VIEWBOX } from "@/lib/geometry.generated";

/**
 * لوحُ التحميل — ستارٌ يعبر مرّةً واحدةً في الجلسة ثم ينسحب.
 *
 * وُلد في تجربة `/about/structure/preview` واختارته الإدارة للموقع كلِّه
 * (١١ أغسطس ٢٠٢٦): «لوحة التحميل مرّة خرافية، اعتمدها لكل الموقع».
 *
 * ── ثلاثةُ ضماناتٍ تجعله آمنًا على موقعٍ كامل ────────────────────────────
 *
 * 1. **ينسحب بـCSS وحدها.** لا سطرَ جافاسكربت واحدٍ مسؤولٌ عن إزالته. أخطرُ
 *    ما في ستائر التحميل أن تعلق فتحجب موقعًا جاهزًا؛ وهنا `animation` هي
 *    التي تسحبه، فتعمل ولو لم تُحمَّل حزمةٌ واحدة.
 * 2. **لا يحجب ضغطةً أبدًا** (`pointer-events: none`)، والمحتوى تحته
 *    مُصيَّرٌ من الخادم كاملًا — فالزاحفُ وقارئُ الشاشة يريانه لا الستار.
 * 3. **مرّةً واحدةً في الجلسة.** النصُّ أدناه يضع `data-loaded` قبل أوّل
 *    رسم، فلا يتكرّر الستارُ في كلِّ صفحةٍ يفتحها الزائر. ولو تعطّلت
 *    الجافاسكربت أو مُنع التخزين، فأسوأُ ما يقع أن يظهر الستارُ ثانيةً
 *    ثم ينسحب — لا أن يعلق. الفشلُ في الاتجاهين آمن.
 *
 * ⚠️ ولا يُركَّب داخل مكوّنٍ عميل: هو وسمٌ ساكنٌ بحت، فيبقى في الخادم.
 */

/** يُحقن `beforeInteractive` — نفس نمط `THEME_INIT_SCRIPT` في هذا المستودع */
export const CURTAIN_INIT_SCRIPT = `try{if(sessionStorage.getItem("mis-loaded")){document.documentElement.dataset.loaded="1"}else{sessionStorage.setItem("mis-loaded","1")}}catch(e){}`;

export function LoadCurtain() {
  return (
    <div className="load-curtain" aria-hidden>
      <svg
        className="load-mark"
        viewBox={MARK_VIEWBOX}
        focusable="false"
        fill="currentColor"
      >
        {MARK_POINTS.map((points) => (
          <polygon key={points} points={points} />
        ))}
      </svg>
      <span className="load-rail" />
    </div>
  );
}
