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

/**
 * يُحقن `beforeInteractive` — نفس نمط `THEME_INIT_SCRIPT` في هذا المستودع.
 *
 * ويؤدّي أمرين: يمنع تكرار الستار في الجلسة، **ويكتب تحيّة القائد قبل أوّل
 * رسم**.
 *
 * ⚠️ **والتحيّةُ خاصّيةٌ في `:root` لا نصٌّ في عنصر.** هذا السطر يسبق وسمَ
 * الستار في المستند، فالعنصرُ غيرُ موجودٍ بعدُ حين يجري — فلا `textContent`
 * يُكتب فيه. والخاصّيةُ تُضبط على الجذر ويلتقطها `content` في CSS متى
 * رُسم اللوح. وغيابُها يعني `content: ""` — أي لا شيء، وهو حالُ الزائر.
 *
 * ⚠️ **ولا تُقرأ الذاكرةُ بلا كوكي جلسة.** الاسمُ محفوظٌ في `localStorage`
 * وهو باقٍ بعد الخروج، والكوكي يزول معه — فالشرطُ يجعل التحيّة تختفي عند
 * الخروج بلا أن نمسح شيئًا. وهي مسألةُ جهازٍ مشترك لا مسألةُ أمان: اللوحُ
 * زينةٌ لا يفتح بابًا.
 *
 * و`JSON.stringify` تُخرج السلسلة مقتبسةً ومهروبةً — وهو ما يقبله `content`.
 */
export const CURTAIN_INIT_SCRIPT = `try{if(sessionStorage.getItem("mis-loaded")){document.documentElement.dataset.loaded="1"}else{sessionStorage.setItem("mis-loaded","1")}}catch(e){}try{if(document.cookie.indexOf("-auth-token")>-1){var h=localStorage.getItem("mis-hail");if(h){document.documentElement.style.setProperty("--mis-hail",JSON.stringify("أهلًا "+h))}}}catch(e){}`;

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
      {/* ⚠️ فارغٌ في الوسم — نصُّه من `content: var(--mis-hail)` في CSS.
          وموضعُه بين العلامة والمسار: التحيّةُ تتبع الهوية، والمسارُ آخر
          ما يُقرأ لأنه مؤشّر تقدّمٍ لا رسالة. */}
      <span className="load-hail" />
      <span className="load-rail" />
    </div>
  );
}
