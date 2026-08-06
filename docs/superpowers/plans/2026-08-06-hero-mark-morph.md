# خطة تنفيذ — واجهة «العلامة المحفورة» وتشكّلها مع التمرير

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** استعادة نظام التصميم المعطّل، ثم بناء واجهةٍ فاتحة تحملها العلامة بمقاسٍ ضخم تتفكّك أضلاعها الستّة مع التمرير إلى علامات صفوف المشاريع ثم تجتمع شعارًا في التذييل.

**Architecture:** طبقة `position: fixed` تحمل ستّة عناصر، كلٌّ ضلعٌ واحد من الشعار، تقرأ مواضع ثلاث مراسٍ (`.mark-anchor` · `.slot`×٦ · `.foot-anchor`) **حيّةً كل إطار** وتُوائم بينها بـ`transform` وحده. المراسي عناصر تخطيط عادية، فالـCSS يحكم أين ترتسم العلامة ولا تُكتب إحداثيات في JS.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · بلا مكتبة حركة (الحركة `transform` خام)

**الوثيقة المرجعية:** [`docs/superpowers/specs/2026-08-06-hero-mark-morph-design.md`](../specs/2026-08-06-hero-mark-morph-design.md)
**النموذج المرجعي:** `../../../../.superpowers/brainstorm/61336-1785971910/content/mark-morph.html`

---

## Global Constraints

- **خمسة ألوان ولا سادس:** `#F9F9F9` `#7FAED9` `#034CA6` `#022D63` `#0F0F0F`. أي درجة أخرى مزيجٌ بين اثنين منها.
- **`--action` (`#034CA6`) للإجراء وحده** — ليس للعناوين ولا للتزيين.
- **زاوية واحدة `24°`** (`--rake`)، وصيغة الحافّة الوحيدة هي القطع المائل. `--rake-tan: 0.4452`.
- **`--radius: 0`** — صفر حواف دائرية · صفر ظلال · صفر توهّج · صفر تدرّجات زخرفية.
- **الخطّان:** `Noto Kufi Arabic` عناوين · `IBM Plex Sans Arabic` متن. لا ثالث.
- **الوصولية حدٌّ أدنى:** تباين `4.5:1` نصّ و`3:1` نصّ كبير · أهداف لمس `≥44×44` · تركيز ظاهر · لا معنى يُنقل باللون وحده.
- **الحركة:** `140–240ms` (`--dur-state` / `--dur-move`) · `transform` و`opacity` فقط · تحترم `prefers-reduced-motion`.
- **لا يُخفى محتوًى بانتظار حركة، إطلاقًا.** لا `opacity: 0` على نصّ، ولا حركة دخول.
- **RTL أصل:** `dir="rtl"` من الجذر · مسافات منطقية (`ps/pe`) · كل نصّ لاتيني معزول `dir="ltr"`.
- **قواعد المحتوى:** لا أسماء أشخاص · حالتان للتقديم لا ثالثة («لا قريبًا») · لا أرقام بلا مصدر · لا يُرسم شعارٌ بالتقدير.

**لا يوجد إطار اختبار في المشروع** (`package.json` فيه `dev/build/start/lint` فقط). فبوّابة كل مهمّة **قياسٌ في المتصفّح** عبر `scripts/audit.js` المُنشأ في المهمّة ١، إضافةً إلى `npx tsc --noEmit` و`npm run build`.

---

## بنية الملفات

| الملف | المسؤولية |
|---|---|
| `src/app/globals.css` | **يُعدّل** — تسجيل رموز `tokens.generated.css` في `@theme` |
| `scripts/audit.js` | **جديد** — حصّالة القياس: رموز · تباين · تشكّل · تغطية نصّ |
| `src/components/site/mark-morph.tsx` | **جديد** — الطبقة المتشكّلة وحدها. لا تعرف شيئًا عن المحتوى، تقرأ مراسي بالمُحدِّدات |
| `src/components/site/hero.tsx` | **يُعاد بناؤه** — التركيب الفاتح + مرساة العلامة |
| `src/components/site/hero-field.tsx` | **يُحذف** |
| `src/components/site/project-index.tsx` | **جديد** — صفوف المشاريع وخاناتها |
| `src/app/page.tsx` | **يُعدّل** — يركّب `MarkMorph` + `Hero` + `ProjectIndex` |
| `src/components/site/site-footer.tsx` | **يُعدّل** — مرساة شعار التذييل |
| `src/components/ui/background-paths.tsx` + `src/app/_preview-paths/` | **يُحذفان معًا** |

> ⚠️ `raked-field.tsx` **لا يُحذف** — فُحص وله مستهلكان حيّان: `page-header.tsx` (ترويسة كل صفحة داخلية) و`site-footer.tsx`.

---

## Task 1: استعادة نظام التصميم — تسجيل الرموز في `@theme`

**Files:**
- Modify: `src/app/globals.css:13` (كتلة `@theme` القائمة)
- Create: `scripts/audit.js`

**Interfaces:**
- Produces: أصناف Tailwind عاملة — `p*/m*/gap-s1..s10` · `text-fg` `text-fg-muted` `text-accent` `bg-accent` `text-accent-fg` `bg-bg-raised` `bg-bg-sunken` `border-border` `bg-surface-ink` `text-on-ink` `text-on-ink-dim` · `font-display` · `text-display` `text-lead` · `max-w-measure`
- Produces: `window.__audit` بالدوال `tokens()` · `contrast()` · `morph()` · `coverage()` · `all()`

**السبب المقيس:** الرموز معرّفة في `:root` داخل `tokens.generated.css` لكنها غير مسجَّلة في `@theme`، فأصناف Tailwind لا تتولّد. قِيس على `3300`: `px-s4` ⇒ `0px` (٣١٦ استعمالًا) · `bg-accent` ⇒ شفّاف · `font-display` ⇒ يسقط لخطّ المتن · `text-display` ⇒ `16px`.

- [ ] **Step 1: اكتب حصّالة القياس (وهي «الاختبار» في هذا المشروع)**

أنشئ `scripts/audit.js`:

```js
/* حصّالة قياس واجهة نادي MIS.
   تُلصق في وحدة تحكّم المتصفّح على أي صفحة من الموقع، أو تُنفَّذ عبر أدوات
   المعاينة. لا تعتمد على أي حزمة. تقرأ ما يُرسم فعلًا لا ما نظنّه. */
(function () {
  function parse(c) {
    var n = (c.match(/[\d.]+/g) || []).map(Number);
    return /^color\(/.test(c) ? n.slice(0, 3).map(function (x) { return x * 255; }) : n.slice(0, 3);
  }
  function lum(c) {
    var v = parse(c).map(function (x) {
      x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  function ratio(a, b) {
    var s = [lum(a), lum(b)].sort(function (p, q) { return q - p; });
    return +((s[0] + 0.05) / (s[1] + 0.05)).toFixed(2);
  }
  function bgOf(el) {
    var e = el;
    while (e && e.nodeType === 1) {
      var c = getComputedStyle(e).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && !/\/\s*0\)/.test(c)) return c;
      e = e.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor;
  }

  /* ١) هل تولّدت أصناف الرموز؟ نحقن عنصرًا ونقيس ما يُرسم. */
  function tokens() {
    var probe = document.createElement('div');
    probe.style.cssText = 'position:absolute;left:-9999px;top:0';
    document.body.appendChild(probe);
    function read(cls, prop) {
      var d = document.createElement('div');
      d.className = cls; probe.appendChild(d);
      var v = getComputedStyle(d)[prop];
      probe.removeChild(d);
      return v;
    }
    var css = getComputedStyle(document.documentElement);
    var out = {
      'px-s4': read('px-s4', 'paddingInlineStart'),
      'gap-s3': read('gap-s3', 'columnGap'),
      'text-fg': read('text-fg', 'color'),
      'text-fg-muted': read('text-fg-muted', 'color'),
      'bg-accent': read('bg-accent', 'backgroundColor'),
      'text-accent': read('text-accent', 'color'),
      'bg-surface-ink': read('bg-surface-ink', 'backgroundColor'),
      'text-on-ink': read('text-on-ink', 'color'),
      'bg-bg-raised': read('bg-bg-raised', 'backgroundColor'),
      'font-display': read('font-display', 'fontFamily'),
      'text-display': read('text-display', 'fontSize'),
      'text-lead': read('text-lead', 'fontSize'),
      'max-w-measure': read('max-w-measure', 'maxWidth')
    };
    document.body.removeChild(probe);
    var fail = [];
    if (out['px-s4'] !== '16px') fail.push('px-s4 = ' + out['px-s4'] + ' (المتوقّع 16px)');
    if (out['gap-s3'] !== '12px') fail.push('gap-s3 = ' + out['gap-s3'] + ' (المتوقّع 12px)');
    if (!/Kufi/.test(out['font-display'])) fail.push('font-display = ' + out['font-display']);
    if (parseFloat(out['text-display']) <= 20) fail.push('text-display = ' + out['text-display'] + ' (لم يتولّد)');
    if (out['bg-accent'] === 'rgba(0, 0, 0, 0)') fail.push('bg-accent شفّاف');
    if (out['bg-surface-ink'] === 'rgba(0, 0, 0, 0)') fail.push('bg-surface-ink شفّاف');
    if (out['max-w-measure'] === 'none') fail.push('max-w-measure = none');
    /* الخطّ مكرّر بين tokens.generated.css و@theme — يجب ألّا يفترقا */
    if (css.getPropertyValue('--font-display').replace(/\s+/g, '') !==
        out['font-display'].replace(/\s+/g, '')) {
      fail.push('‎--font-display‎ في الرموز يخالف صنف font-display');
    }
    return { values: out, fail: fail, pass: fail.length === 0 };
  }

  /* ٢) تباين كل عقدة نصّية على الخلفية المرسومة فعلًا */
  function contrast(root) {
    var bad = [];
    (root || document).querySelectorAll('main *, header *, footer *').forEach(function (el) {
      var hasText = Array.prototype.some.call(el.childNodes, function (n) {
        return n.nodeType === 3 && n.textContent.trim();
      });
      if (!hasText) return;
      var cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) return;
      var fs = parseFloat(cs.fontSize), w = parseInt(cs.fontWeight, 10) || 400;
      var need = (fs >= 24 || (fs >= 18.66 && w >= 700)) ? 3 : 4.5;
      var r = ratio(cs.color, bgOf(el));
      if (r < need) bad.push({ text: el.textContent.trim().slice(0, 26), ratio: r, need: need });
    });
    return { fail: bad, pass: bad.length === 0 };
  }

  /* ٣) دقّة هبوط الأضلاع الستّة على مراسيها */
  var PTS = [
    '460,0 813,0 659.8,339 306.8,339',
    '659,339 1012,339 859.2,677 506.2,677',
    '153,677 506,677 352.8,1016 -0.2,1016',
    '1518,0 1871,0 1411.8,1016 1058.8,1016',
    '2224,0 2577,0 2347.4,508 1994.4,508',
    '2347,508 2700,508 2470.4,1016 2117.4,1016'
  ];
  var BOX = PTS.map(function (p) {
    var xy = p.split(' ').map(function (q) { return q.split(',').map(Number); });
    var xs = xy.map(function (a) { return a[0]; }), ys = xy.map(function (a) { return a[1]; });
    return {
      x: Math.min.apply(null, xs), y: Math.min.apply(null, ys),
      w: Math.max.apply(null, xs) - Math.min.apply(null, xs),
      h: Math.max.apply(null, ys) - Math.min.apply(null, ys)
    };
  });
  function morph() {
    var hero = document.querySelector('[data-mark-anchor="hero"]');
    var foot = document.querySelector('[data-mark-anchor="foot"]');
    var slots = [].slice.call(document.querySelectorAll('[data-mark-slot]'));
    var sh = [].slice.call(document.querySelectorAll('[data-mark-shard]'));
    if (!sh.length) return { skipped: 'لا طبقة متشكّلة (تقليل حركة أو بلا JS)' };
    function err(anchor, k) {
      var a = anchor.getBoundingClientRect(), s = a.width / 2701;
      return +Math.max.apply(null, sh.map(function (el, i) {
        var r = el.getBoundingClientRect();
        return Math.max(Math.abs(r.left - (a.left + BOX[i].x * s)),
                        Math.abs(r.top - (a.top + BOX[i].y * s)),
                        Math.abs(r.width - BOX[i].w * s));
      })).toFixed(1);
    }
    var slotErr = slots.length === 6 ? +Math.max.apply(null, sh.map(function (el, i) {
      var r = el.getBoundingClientRect(), t = slots[i].getBoundingClientRect();
      return Math.max(Math.abs(r.left - t.left), Math.abs(r.top - t.top), Math.abs(r.width - t.width));
    })).toFixed(1) : null;
    return { scrollY: Math.round(scrollY), slots: slots.length,
             vsHero: err(hero), vsSlots: slotErr, vsFoot: err(foot) };
  }

  /* ٤) هل تحجب القطعُ نصًّا؟ بترتيب الرسم الحقيقي لا بتقاطع المستطيلات */
  function coverage() {
    var layer = document.querySelector('[data-mark-layer]');
    if (!layer) return { skipped: 'لا طبقة' };
    var sh = [].slice.call(document.querySelectorAll('[data-mark-shard]'));
    layer.style.pointerEvents = 'auto';
    sh.forEach(function (s) { s.style.pointerEvents = 'auto'; });
    var hit = [];
    document.querySelectorAll('main h1, main h2, main h3, main p, main a span, footer p')
      .forEach(function (t) {
        var b = t.getBoundingClientRect();
        if (!t.textContent.trim() || b.width === 0 || b.bottom < 2 || b.top > innerHeight - 2) return;
        for (var f = 0.15; f <= 0.85; f += 0.175) {
          var x = b.left + b.width * f, y = b.top + b.height * 0.5;
          if (x < 1 || x > innerWidth - 1 || y < 1 || y > innerHeight - 1) continue;
          var el = document.elementFromPoint(x, y);
          if (el && el.closest && el.closest('[data-mark-shard]')) {
            hit.push(t.textContent.trim().slice(0, 22)); break;
          }
        }
      });
    layer.style.pointerEvents = 'none';
    sh.forEach(function (s) { s.style.pointerEvents = ''; });
    return { fail: hit, pass: hit.length === 0 };
  }

  function all() {
    return { tokens: tokens(), contrast: contrast(), morph: morph(), coverage: coverage(),
             horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
  }
  window.__audit = { tokens: tokens, contrast: contrast, morph: morph, coverage: coverage, all: all };
  return 'audit جاهزة — استعمل __audit.all()';
})();
```

- [ ] **Step 2: شغّلها وتأكّد أنها ترسب**

شغّل `npm run dev -- -p 3300`، افتح `http://localhost:3300`، ألصق محتوى `scripts/audit.js` في وحدة التحكّم، ثم:

```js
__audit.tokens()
```

**المتوقّع: `pass: false`** وفي `fail` سطورٌ منها `px-s4 = 0px (المتوقّع 16px)` و`text-display = 16px (لم يتولّد)` و`bg-accent شفّاف`.

- [ ] **Step 3: سجّل الرموز في `@theme`**

في `src/app/globals.css`، **أضِف بعد** كتلة `@theme` القائمة (لا تحذف ما فيها):

```css
/* ==========================================================================
   جسر الرموز → Tailwind v4

   `tokens.generated.css` يعرّف الرموز في `:root` فقط، وTailwind لا يولّد
   صنفًا لرمزٍ غير مسجَّل في `@theme`. فبدون هذي الكتلة تنزل `px-s4` و
   `text-fg` و`font-display` **صامتةً بلا خطأ بناء** — وهذا ما جعل عنوان
   الواجهة يُرسم 16px أبيض على أبيض.

   `inline` مقصودة: تُبقي القيمة `var(--token)` حيّةً وقت التشغيل، فينقلب
   الوضع الداكن مع `[data-theme="dark"]` بلا إعادة توليد.
   ========================================================================== */
@theme inline {
  /* المسافات — سلّم 4px */
  --spacing-s1: var(--s1);
  --spacing-s2: var(--s2);
  --spacing-s3: var(--s3);
  --spacing-s4: var(--s4);
  --spacing-s5: var(--s5);
  --spacing-s6: var(--s6);
  --spacing-s7: var(--s7);
  --spacing-s8: var(--s8);
  --spacing-s9: var(--s9);
  --spacing-s10: var(--s10);

  /* الأدوار الدلالية — لا الألوان الخام */
  --color-fg: var(--ink);
  --color-fg-muted: var(--ink-quiet);
  --color-fg-invert: var(--on-ink);
  --color-accent: var(--action);
  --color-accent-hover: var(--action-hover);
  --color-accent-fg: var(--on-action);
  --color-bg: var(--surface);
  --color-bg-raised: var(--surface-raised);
  --color-bg-sunken: var(--surface-sunken);
  --color-surface-ink: var(--surface-ink);
  --color-surface-floor: var(--surface-floor);
  --color-on-ink: var(--on-ink);
  --color-on-ink-dim: var(--on-ink-dim);
  --color-on-ink-quiet: var(--on-ink-quiet);
  --color-border: var(--line);
  --color-border-quiet: var(--line-quiet);
  --color-border-strong: var(--line-control);
  --color-ring: var(--focus);

  /* المقاسات وارتفاعات السطور */
  --text-display: var(--t-display);
  --text-lead: var(--t-lead);
  --leading-display: var(--lh-display);
  --leading-head: var(--lh-head);
  --leading-body: var(--lh-body);

  /* عرض الفقرة المريح */
  --container-measure: var(--measure);
}

/* ⚠️ الخطّان **قيمتان حرفيّتان** لا `var()`: اسم مفتاح Tailwind
   (`--font-display`) يطابق اسم الرمز الخام حرفًا بحرف، فـ`var(--font-display)`
   داخل `@theme` تشير إلى نفسها فتبطل. والقيمة هنا تغلب قيمة الرموز لأنها
   تُكتب بعدها على `:root` — فلا تفترق نسختان. وحصّالة القياس تتحقّق من
   تطابقهما، فإن أعاد `brand/v2/build.mjs` توليد خطٍّ جديد رسب الفحص. */
@theme {
  --font-display: "Noto Kufi Arabic", "Plex Kufi", system-ui, sans-serif;
  --font-text: "IBM Plex Sans Arabic", system-ui, sans-serif;
}
```

- [ ] **Step 4: شغّلها وتأكّد أنها تنجح**

أعِد تحميل `http://localhost:3300`، ألصق الحصّالة، ثم:

```js
__audit.tokens()
```

**المتوقّع: `pass: true`** و`px-s4: "16px"` و`gap-s3: "12px"` و`font-display` فيه `Noto Kufi Arabic` و`text-display` أكبر من `20px` و`bg-accent: "rgb(3, 76, 166)"` و`max-w-measure: "62ch"`.

- [ ] **Step 5: افحص أن التباين لم ينكسر بعودة الألوان**

```js
__audit.contrast()
```

**المتوقّع: `pass: true`.** لو رسب شيء، أصلحه هنا قبل المضيّ — عودة الألوان الدلالية تغيّر خلفيات لم تكن تُرسم.

- [ ] **Step 6: تحقّق من الأنواع والبناء**

```bash
npx tsc --noEmit && npm run build
```
المتوقّع: كلاهما بلا أخطاء.

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css scripts/audit.js
git commit -m "fix: تسجيل رموز التصميم في @theme — استعادة المسافات والألوان وخطّ العرض

الرموز كانت في :root وحدها، وTailwind v4 لا يولّد صنفًا لرمزٍ غير مسجَّل
في @theme. فنزلت 316 استعمالًا لمسافات s1..s10 و119 لـtext-fg و42
لـfont-display صامتةً بلا خطأ بناء، وصار عنوان الواجهة 16px أبيض على أبيض.

ومعها scripts/audit.js: حصّالة قياس بلا حزم تقرأ ما يُرسم فعلًا.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: مكوّن `MarkMorph` — الطبقة المتشكّلة

**Files:**
- Create: `src/components/site/mark-morph.tsx`
- Test: `scripts/audit.js` ← `__audit.morph()`

**Interfaces:**
- Consumes: `MARK_POINTS` و`MARK_VIEWBOX` من `@/lib/geometry.generated`
- Produces: `<MarkMorph />` — بلا خصائص. تبحث بنفسها عن `[data-mark-anchor="hero"]` و`[data-mark-anchor="foot"]` و`[data-mark-slot]`، وتضع `[data-mark-layer]` و`[data-mark-shard]` لتقرأها الحصّالة.

- [ ] **Step 1: اكتب المكوّن**

أنشئ `src/components/site/mark-morph.tsx`:

```tsx
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
      if (!hero || !foot) return;

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
      document.documentElement.classList.add("mark-morphing");
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
```

- [ ] **Step 2: أضف قواعد الإخفاء والطبقات في `globals.css`**

ألحِق بآخر `src/app/globals.css`:

```css
/* حين تعمل الطبقة المتشكّلة، تُخفى نسخُ العلامة الثابتة فلا تُرسم مرّتين.
   وحين لا تعمل — بلا JS أو بتقليل حركة — تبقى الثابتة وحدها ظاهرة. */
html.mark-morphing [data-mark-static] {
  visibility: hidden;
}

/* ⚠️ **بدون هذي القاعدة تحجب القطعُ النصّ.** `main` عنصرٌ `position: relative`
   بخلفية، فطبقةُ العلامة عند `z-index: 1` تُرسم فوقه وفوق كل نصٍّ غير مموضَع
   بداخله. فيُرفع محتوى الأقسام المنسابة فوقها صراحةً.

   والواجهة الأولى مستثناة عمدًا: مسرحها `sticky` وهو سياق تراكبٍ مستقلّ،
   فرفعُه يرفع معه الحقلَ الفاتح فتختفي القطع خلفه. والنصّ فيها لا يتقاطع مع
   العلامة أصلًا — وهذا ما يتحقّق منه `__audit.coverage()`. */
.above-mark {
  position: relative;
  z-index: 2;
}
```

- [ ] **Step 3: تحقّق من الأنواع**

```bash
npx tsc --noEmit
```
المتوقّع: بلا أخطاء. (المكوّن غير مركَّب بعد، فلا فحص متصفّح في هذي المهمّة.)

- [ ] **Step 4: Commit**

```bash
git add src/components/site/mark-morph.tsx src/app/globals.css
git commit -m "feat: مكوّن MarkMorph — أضلاع الشعار الستّة تتشكّل بين ثلاث مراسٍ

طبقة fixed زخرفية تقرأ مراسيها حيّةً كل إطار (المرساة داخل مسرحٍ ملتصق
فموضعها في المستند يتغيّر بينما موضعها في الشاشة ثابت)، وتحرّك بـtransform
وحده. مرحلة الصفوف تُعطَّل إن لم تكن ستّةً بالضبط.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: إعادة بناء `Hero` على التركيب الفاتح

**Files:**
- Rewrite: `src/components/site/hero.tsx`
- Delete: `src/components/site/hero-field.tsx`
- Modify: `src/app/page.tsx` (تركيب `MarkMorph` و`Hero`)

**Interfaces:**
- Consumes: `<MarkMorph />` من المهمّة ٢ · `PRIMARY_ACTION` من `@/content/navigation`
- Produces: `<Hero isOpen: boolean />` ومعها `[data-mark-anchor="hero"]` و`[data-mark-static]`

- [ ] **Step 1: اكتب الواجهة**

استبدل محتوى `src/components/site/hero.tsx` بالكامل:

```tsx
import { Mark } from "@/components/site/mark";
import { PRIMARY_ACTION } from "@/content/navigation";

/**
 * الواجهة الأولى — «العلامة المحفورة».
 *
 * **التركيب:** مسرحٌ ملتصق بارتفاع الطية. العلامة بمقاسٍ ضخم أسفل يسار تنزف
 * عن الحافّة المنتهية وتجلس على القاع، والنصّ أعلى يمين، وحقلٌ فاتح حافّته
 * مقصوصة ٢٤° يفصل المستويين. المكدّس المعتاد مكسورٌ عمدًا: لا لصيقة فوق
 * العنوان ولا زرّ تحته — الإجراء في الشريط وحده.
 *
 * ⚠️ **لا يُخفى محتوًى بانتظار حركة.** العنوان والشارح والحالة مرسومةٌ كاملةً
 * من أول إطار. والحركة كلّها في `MarkMorph`، وهي زخرفة.
 *
 * حافّة الحقل مبنيّةٌ من `linear-gradient` بزاوية `90° + 24°`، فتكون دقيقةً
 * **بالبناء** مهما تغيّر ارتفاع الكتلة — لا بحسابٍ يدويّ يفسد عند أي مقاس.
 */

type HeroProps = {
  /** حالتان لا ثالثة — لا «قريبًا» */
  isOpen: boolean;
};

export function Hero({ isOpen }: HeroProps) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative h-[150svh]"
    >
      <div className="sticky top-[var(--header-h)] h-[calc(100svh-var(--header-h))] overflow-hidden">
        {/* الحقل الفاتح — الزاوية من التدرّج نفسه، ٩٠°+٢٤° */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(114deg,var(--surface-sunken)_0_57%,transparent_57%)]"
        />

        {/* مرساة العلامة: التخطيط يحكم أين ترتسم، ولا إحداثيات في JS.
            ⚠️ `Mark` يقبل `className` و`decorative` فقط ولا ينشر خصائص
            أخرى — فـ`data-mark-static` تُوضع على الغلاف لا عليه. */}
        <div
          aria-hidden
          data-mark-anchor="hero"
          className="absolute bottom-[-3%] left-[-10%] w-[72%] max-md:bottom-[-4%] max-md:left-[-46%] max-md:w-[235%]"
          style={{ aspectRatio: "2701 / 1016" }}
        >
          <div data-mark-static="" className="h-full w-full">
            <Mark decorative className="h-full w-full text-surface-floor" />
          </div>
        </div>

        <div className="absolute inset-x-s4 top-s5 max-w-[60rem] sm:inset-x-s7">
          <h1
            id="hero-heading"
            className="font-display text-display font-bold leading-display tracking-[-0.014em] text-surface-floor"
          >
            بين الإدارة والتقنية،
            <br />
            نصنع الأثر.
          </h1>
          <p className="mt-s5 max-w-[36ch] text-lead leading-body text-fg-muted">
            مجتمع طلابي يحوّل المعرفة إلى خبرة، والأفكار إلى مشاريع، والطموح إلى
            مستقبل مهني أوضح.
          </p>
        </div>

        {/* `start-*` هي أداة الإزاحة المنطقية في Tailwind v4 — في RTL تعني
            اليمين، وهو المطلوب: الكولوفون يبدأ من حيث تبدأ القراءة. */}
        <div className="absolute bottom-s5 start-s4 max-w-[34rem] text-sm leading-body text-fg-muted sm:start-s7">
          <p>نادي نظم المعلومات الإدارية · جامعة الملك سعود</p>
          <p className="font-semibold text-fg">
            {isOpen ? "التقديم مفتوح" : "التقديم مغلق حاليًا"}
          </p>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: احذف الحقل القديم وركّب الطبقة في الصفحة**

```bash
git rm src/components/site/hero-field.tsx
```

في `src/app/page.tsx` أضف الاستيراد وركّب الطبقة قبل `<SiteHeader />`:

```tsx
import { MarkMorph } from "@/components/site/mark-morph";
// …
return (
  <>
    <MarkMorph />
    <SiteHeader />
    {/* … */}
  </>
);
```

- [ ] **Step 3: افحص — العنوان والتباين والتغطية**

شغّل `npm run dev -- -p 3300`، افتح الصفحة، ألصق `scripts/audit.js`، ثم:

```js
(function(){
  const h1 = document.querySelector('#hero-heading');
  const lines = Math.round(h1.getBoundingClientRect().height / parseFloat(getComputedStyle(h1).lineHeight));
  return { سطور_العنوان: lines, ...__audit.morph(), تباين: __audit.contrast().pass, تغطية: __audit.coverage().pass };
})()
```

**المتوقّع:** `سطور_العنوان: 2` · `vsHero: 0` · `تباين: true` · `تغطية: true`.
كرّر على عروض `320` و`768` و`1280` و`1440` — العنوان **سطران في كلها**.

- [ ] **Step 4: افحص التدهور الآمن**

عطّل JavaScript في المتصفّح وأعد التحميل: العنوان والشارح والحالة **ظاهرة**، والشعار الثابت مرسوم. ثم فعّل «تقليل الحركة» في النظام وأعد التحميل: النتيجة نفسها، وبلا مستمع تمرير.

- [ ] **Step 5: البناء**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add -A src/components/site/hero.tsx src/app/page.tsx
git commit -m "feat: واجهة «العلامة المحفورة» — تركيب فاتح تحمله العلامة مرّةً واحدة

تسقط الواجهة الداكنة الممتدّة والحقل المائل التفاعلي. المكدّس المعتاد
مكسور عمدًا: لا لصيقة فوق العنوان ولا زرّ تحته، والإجراء في الشريط وحده.
حافّة الحقل من linear-gradient بزاوية 90°+24° فتكون دقيقةً بالبناء.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 4: صفوف المشاريع وخاناتها

**Files:**
- Create: `src/components/site/project-index.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `PROJECTS` و`projectHref` من `@/content/projects` · `isolateLatin` من `@/lib/bidi`
- Produces: `<ProjectIndex />` تُخرج `[data-mark-slot]` لكل مشروع

- [ ] **Step 1: اكتب المكوّن**

أنشئ `src/components/site/project-index.tsx`:

```tsx
import Link from "next/link";

import { PROJECTS, projectHref } from "@/content/projects";
import { isolateLatin } from "@/lib/bidi";

/**
 * فهرس المشاريع — وخاناته هي مهبط أضلاع الشعار.
 *
 * الخانة `[data-mark-slot]` صندوقٌ بمقاسٍ ثابت يحمل علامةً ثابتة
 * (`[data-mark-static]`). حين تعمل الطبقة المتشكّلة تُخفى الثابتة ويهبط
 * الضلع الطائر في مكانها بالضبط؛ وحين لا تعمل تبقى الثابتة وحدها.
 *
 * ⚠️ العلامة ليست حاملة معنى — ترتيب المشروع في الرقيمة، واسمه في النصّ.
 * فهي `aria-hidden` ولا يُنقل بها معنى.
 */
export function ProjectIndex() {
  return (
    /* `above-mark` تلزم هنا: بدونها تُرسم القطعُ الطائرة فوق أسماء المشاريع
       وأوصافها فتحجبها — رُصد فعليًّا في النموذج قبل ضبط الطبقات. */
    <section
      id="projects"
      aria-labelledby="projects-heading"
      className="above-mark w-full py-s8"
    >
      <h2
        id="projects-heading"
        className="px-s4 font-display text-sm font-semibold tracking-[0.12em] text-fg-muted sm:px-s7"
      >
        ما نعمل عليه
      </h2>

      <ul className="mt-s6 px-s4 sm:px-s7">
        {PROJECTS.map((project, index) => (
          <li key={project.slug}>
            <Link
              href={projectHref(project)}
              className="-mx-s3 flex min-h-14 items-center gap-s4 px-s3 py-s3 transition-colors hover:bg-bg-sunken"
            >
              <span
                aria-hidden
                data-mark-slot={index}
                className="relative block h-[38px] w-[30px] shrink-0"
              >
                <span
                  data-mark-static=""
                  className="absolute inset-0 bg-surface-floor"
                  style={{ clipPath: "polygon(44.5% 0, 100% 0, 55.5% 100%, 0 100%)" }}
                />
              </span>
              <span className="w-[2ch] shrink-0 font-display text-sm font-medium text-fg-muted">
                {`0${index + 1}`}
              </span>
              <span className="shrink-0 font-display text-xl font-bold text-surface-floor sm:text-2xl">
                {isolateLatin(project.name)}
              </span>
              {project.tagline ? (
                <span className="text-sm text-fg-muted">{project.tagline}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: ركّبه في الصفحة**

في `src/app/page.tsx` أضف `import { ProjectIndex } from "@/components/site/project-index";` وضع `<ProjectIndex />` مباشرةً بعد `<Hero … />`.

- [ ] **Step 3: افحص هبوط الأضلاع**

مرّر حتى تستقرّ الصفوف في نصف الشاشة، ثم:

```js
__audit.morph()
```

**المتوقّع:** `slots: 6` و`vsSlots: 0` (أو أقل من `1`). ثم:

```js
__audit.coverage()
```
**المتوقّع: `pass: true`** — لا قطعة تحجب نصًّا.

- [ ] **Step 4: افحص قاعدة العدد**

في وحدة التحكّم، احذف صفًّا مؤقّتًا وتأكّد أن المرحلة تتعطّل بلا كسر:

```js
document.querySelector('[data-mark-slot="5"]').removeAttribute('data-mark-slot');
window.dispatchEvent(new Event('scroll'));
setTimeout(() => console.log(__audit.morph()), 100);
```
**المتوقّع:** `slots: 5` و`vsSlots: null` — والأضلاع تبقى مجتمعةً بلا ارتباك. أعِد تحميل الصفحة بعدها.

- [ ] **Step 5: البناء**

```bash
npx tsc --noEmit && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/components/site/project-index.tsx src/app/page.tsx
git commit -m "feat: فهرس المشاريع وخاناته — مهبط أضلاع الشعار

كل صفٍّ يحمل خانةً بمقاسٍ ثابت فيها علامةٌ ثابتة تُخفى حين تعمل الطبقة
المتشكّلة. الأسماء اللاتينية معزولة، وأهداف النقر 56px.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 5: مرساة التذييل — اجتماع العلامة

**Files:**
- Modify: `src/components/site/site-footer.tsx`

**Interfaces:**
- Produces: `[data-mark-anchor="foot"]` مع `[data-mark-static]` بداخلها

- [ ] **Step 1: أضف المرساة**

في `src/components/site/site-footer.tsx`، أضف قبل إغلاق `</footer>`:

```tsx
{/* اجتماع العلامة — الشعار ملتصقٌ بالحافّة السفلى بلا فجوة تحته،
    فيُقرأ توقيعًا لا نصًّا مركونًا.
    ⚠️ `data-mark-static` على الغلاف لا على `Mark` — فهو لا ينشر خصائص. */}
<div
  aria-hidden
  data-mark-anchor="foot"
  className="mx-auto mt-s8 w-full max-w-[72rem] px-s4 sm:px-s7"
  style={{ aspectRatio: "2701 / 1016" }}
>
  <div data-mark-static="" className="h-full w-full">
    <Mark decorative className="h-full w-full text-on-ink" />
  </div>
</div>
```

وأضف `import { Mark } from "@/components/site/mark";` إن لم يكن موجودًا.

**وأضف `above-mark`** إلى غلاف نصّ التذييل (الروابط والحقوق) — لا إلى المرساة —
فيبقى النصّ فوق القطع الطائرة بينما يظهر الشعار تحتها.

- [ ] **Step 2: افحص الاجتماع**

مرّر إلى قاع الصفحة، ثم:

```js
__audit.morph()
```
**المتوقّع:** `vsFoot: 0` (أو أقل من `1`).

- [ ] **Step 3: افحص التباين على أرضية التذييل**

```js
__audit.contrast()
```
**المتوقّع: `pass: true`** — أرضية التذييل داكنة، فتأكّد أن العلامة والنصّ فوقها يحقّقان العتبة.

- [ ] **Step 4: Commit**

```bash
git add src/components/site/site-footer.tsx
git commit -m "feat: مرساة شعار التذييل — الأضلاع تجتمع في نهاية الرحلة

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 6: تنظيف وفحص القبول الكامل

**Files:**
- Delete: `src/components/ui/background-paths.tsx` · `src/app/_preview-paths/`
- Verify: كل ما سبق

- [ ] **Step 1: احذف الميت**

```bash
git rm src/components/ui/background-paths.tsx
git rm -r src/app/_preview-paths
grep -rn "background-paths\|BackgroundPaths\|_preview-paths" src/ || echo "لا مرجع باقٍ"
```
**المتوقّع:** `لا مرجع باقٍ`.

> ⚠️ لا تحذف `raked-field.tsx` — مستهلكاه `page-header.tsx` و`site-footer.tsx` حيّان.

- [ ] **Step 2: شغّل الحصّالة كاملةً على أربعة عروض**

على كلٍّ من `320` و`768` و`1280` و`1440`:

```js
__audit.all()
```

**المتوقّع في كلّها:** `tokens.pass: true` · `contrast.pass: true` · `coverage.pass: true` · `horizontalOverflow: false`.

- [ ] **Step 3: افحص أهداف اللمس وعزل اللاتيني**

```js
(function(){
  const small = [...document.querySelectorAll('a,button')]
    .map(e => ({ t: e.textContent.trim().slice(0,18), r: e.getBoundingClientRect() }))
    .filter(o => o.r.width > 0 && (o.r.height < 44 || o.r.width < 44))
    .map(o => o.t + ' ' + Math.round(o.r.width) + '×' + Math.round(o.r.height));
  const bare = [...document.querySelectorAll('main *, footer *')]
    .filter(e => [...e.childNodes].some(n => n.nodeType === 3 && /[A-Za-z]{2,}/.test(n.textContent)))
    .filter(e => !e.closest('[dir="ltr"]'))
    .map(e => e.textContent.trim().slice(0,24));
  return { أهداف_صغيرة: small, لاتيني_غير_معزول: bare };
})()
```
**المتوقّع:** المصفوفتان فارغتان.

- [ ] **Step 4: تحقّق من معايير القبول الإحدى عشرة**

افتح §١١ من الوثيقة وعلّم كل بند بنتيجته المقيسة. أي بند لا تستطيع إثباته برقم — **ليس محقّقًا**.

- [ ] **Step 5: البناء النهائي**

```bash
npx tsc --noEmit && npm run lint && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: حذف background-paths ومساره، وفحص القبول الكامل

فُحص على 320/768/1280/1440: الرموز والتباين والتغطية والتمرير الأفقي
وأهداف اللمس وعزل اللاتيني — كلها خضراء.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## خارج نطاق هذه الخطة

نموذج التقديم وربط Supabase · صفحات اللجان والمقالات · قسما «القيادات والخريجون» · شعارات المشاريع والشركاء · قرار ضربة الميلان (`mis-slant`) وقرار الخطّ المرخّص — كلاهما في §١٢ من الوثيقة وينتظران كلمة حسام.
