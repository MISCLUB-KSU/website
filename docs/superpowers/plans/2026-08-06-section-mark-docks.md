# خطّة تنفيذ — مراسي الأقسام

> **للمنفِّذ:** استعمل `superpowers:subagent-driven-development` (موصى به) أو
> `superpowers:executing-plans` للتنفيذ مهمّةً مهمّة. الخطوات بصيغة `- [ ]`.
> **الوثيقة:** `docs/superpowers/specs/2026-08-06-section-mark-docks-design.md`

**الهدف:** أضلاع الشعار الستّة تتوزّع على ثلاثة أقسام، كلُّ ضلعٍ يحلّ محلّ
ضربة ميلانٍ زخرفيّة قائمة، ثم تنطلق كلُّها وتجتمع شعارًا في التذييل.

**المعمار:** كل هدفٍ يحمل `data-mark-dock="i"` حيث `i` فهرس الضلع في
`MARK_BOXES`. و`mark-morph.tsx` يمنح كل ضلعٍ خطًّا زمنيًّا مستقلًّا
(`tDock[i]`) بدل خطٍّ واحدٍ مشترك، ويبقي `t2` (الاجتماع) مشتركًا لا يبدأ حتى
ترسو الأضلاع الستّة كلُّها. الإخفاء يتّكئ على قاعدة CSS قائمة
(`html.mark-morphing [data-mark-static]`).

**التقنيات:** Next.js 16 · React 19 · Tailwind v4 · TypeScript.

## قيود عامّة

- **لا إطار اختبار في المستودع.** «الاختبار» هنا هو القياس الحيّ عبر
  `scripts/audit.js` + لوحة المتصفّح. كل مهمّة تبدأ بفحصٍ يرسب.
- **`src/components/site/pillar-mark.tsx` لا يُمَسّ** — ثلاثة رموزٍ لها معانٍ
  (§٣ من الوثيقة).
- **العيّنة الكثيفة إلزاميّة:** 533 نقطة (41×13) لا 48 — الخشنة أعطت صفرًا
  كاذبًا مقيسًا.
- **ترتيب القياس إلزاميّ:** بدّل المقاس ← `navigate` لتحميلٍ كامل ← انتظر
  استقرار الأضلاع (تطابق حدودها مع حدود مراسيها، ثابتًا قراءتين) ← قِس.
  تغييرُ الأنماط بـ`element.style` **لا** يُعيد توضيع الأضلاع.
- **لون الضلع `--mark-quiet`** ولا يأخذ لون الهدف — قرار حسام.
- **الارتكاب (`commit`) قرارُ حسام** — لا تُنفَّذ خطوات الارتكاب بلا طلبه.
- **العروض المرجعيّة:** 320 · 390 · 640 · 767 · 768 · 1280، في الوضعين.

---

## بنية الملفات

| الملف | المسؤوليّة بعد التنفيذ |
|-------|------------------------|
| `scripts/audit.js` | يضيف `docks()`: وجود الأهداف · تطابق نِسَبها · انطباق الأضلاع · التغطية |
| `src/app/page.tsx` | يحمل `data-mark-dock` + `data-mark-static` والمقاسات الجديدة على ستّة عناصر |
| `src/components/site/mark-morph.tsx` | خطٌّ زمنيّ لكل ضلع بدل خطٍّ مشترك |

---

## Task 1 — المهمّة ١: فحص `docks()` في الحصّالة

**الملفات:**
- تعديل: `scripts/audit.js` (يُضاف بعد `morph()`، ويُسجَّل في `all()`)

**الواجهات:**
- ينتج: `__audit.docks()` تُرجع `{ found, expected, rows, fail, pass }` حيث
  `rows[i] = { dock, shard, dockAspect, shardAspect, aspectErr, dx, dy, dw, dh }`.
  تستهلكها المهمّات ٢ و٣ و٤.

- [ ] **الخطوة ١: اكتب الفحص الذي يرسب**

في `scripts/audit.js`، بعد دالّة `morph()` وقبل `coverage()`:

```js
  /* ٥) مراسي الأقسام: ستّة أهداف، نسبةُ كلٍّ نسبةَ ضلعه، والضلع ينطبق عليه */
  function docks() {
    var BOXES = window.__MARK_BOXES || [];
    var layer = document.querySelector('[data-mark-layer]');
    var els = Array.prototype.slice.call(
      document.querySelectorAll('[data-mark-dock]')
    );
    var fail = [];
    if (!BOXES.length) fail.push('__MARK_BOXES غير منشور — انظر المهمّة ٢');
    /* ⚠️ الشرط `!==` وحده لا يكفي: قبل المهمّة ٢ يكون الطرفان صفرًا فيمرّ
       صامتًا. فيُشترط العدد الحقيقي صراحةً. */
    if (els.length !== 6) {
      fail.push('الأهداف ' + els.length + ' والمتوقّع 6');
    }
    var rows = els.map(function (el) {
      var i = Number(el.dataset.markDock);
      var b = BOXES[i];
      var r = el.getBoundingClientRect();
      var dockAspect = r.height ? r.width / r.height : 0;
      var shardAspect = b ? b.w / b.h : 0;
      var shard = layer && layer.querySelector('[data-mark-shard="' + i + '"]');
      var sr = shard && shard.getBoundingClientRect();
      var row = {
        dock: i,
        dockAspect: +dockAspect.toFixed(4),
        shardAspect: +shardAspect.toFixed(4),
        aspectErr: +Math.abs(dockAspect - shardAspect).toFixed(4),
        dx: sr ? Math.round(sr.left - r.left) : null,
        dy: sr ? Math.round(sr.top - r.top) : null,
        dw: sr ? Math.round(sr.width - r.width) : null,
        dh: sr ? Math.round(sr.height - r.height) : null
      };
      if (!b) fail.push('هدفٌ برقم ضلعٍ خارج المدى: ' + el.dataset.markDock);
      else if (row.aspectErr > 0.02) {
        fail.push('نسبة الهدف ' + i + ' = ' + row.dockAspect +
                  ' والضلع ' + row.shardAspect);
      }
      return row;
    });
    var seen = {};
    rows.forEach(function (r) {
      if (seen[r.dock]) fail.push('رقم ضلعٍ مكرَّر: ' + r.dock);
      seen[r.dock] = 1;
    });
    return { found: els.length, expected: BOXES.length, rows: rows,
             fail: fail, pass: fail.length === 0 };
  }
```

وفي `all()` أضِف `docks: docks()` إلى الكائن المُعاد.

- [ ] **الخطوة ٢: شغّله وتأكّد أنه يرسب**

الحصّالة **لا تُحمَّل تلقائيًّا** — هي دالّةٌ فوريّة تُلصق في سياق الصفحة
وتُسند `window.__audit`. فالتشغيل خطوتان في لوحة المتصفّح على
`http://localhost:3300`:

1. اقرأ `scripts/audit.js` كاملًا وألصق محتواه في `javascript_tool`.
2. ثم:

```js
__audit.docks()
```

المتوقّع: `pass: false` · `found: 0` · `expected: 0` · و`fail` فيه **سطران
بالضبط**: «‎__MARK_BOXES غير منشور — انظر المهمّة ٢» و«الأهداف 0 والمتوقّع 6».
هذا الرسوب هو الدليل أن الفحص يميّز.

- [ ] **الخطوة ٣: الارتكاب (بطلب حسام)**

```bash
git add scripts/audit.js
git commit -m "test: فحص docks() لمراسي الأقسام — يرسب حتى تُبنى"
```

---

## Task 2 — المهمّة ٢: نشر `MARK_BOXES` للحصّالة

**الملفات:**
- تعديل: `src/components/site/mark-morph.tsx` (داخل `useEffect`، بعد `build()`)

**الواجهات:**
- يستهلك: `MARK_BOXES` من `@/lib/mark-boxes`
- ينتج: `window.__MARK_BOXES` — مصفوفة `{x,y,w,h}` بستّة عناصر، يقرأها
  `__audit.docks()` من المهمّة ١.

- [ ] **الخطوة ١: شغّل الفحص وسجّل الرسوب الحالي**

```js
__audit.docks().fail
```

المتوقّع أن يحوي «‎__MARK_BOXES غير منشور».

- [ ] **الخطوة ٢: انشر الصناديق**

في `mark-morph.tsx`، داخل `build()` بعد إسناد `shards`:

```ts
      /* تُنشر للحصّالة وحدها (`__audit.docks`) — القياس يحتاج نِسَب الأضلاع
         الحقيقية، ولا مصدر لها في DOM. لا يقرؤها كودُ المنتج. */
      (window as unknown as { __MARK_BOXES?: readonly MarkBox[] }).__MARK_BOXES =
        BOXES;
```

وأضِف الاستيراد أعلى الملف:

```ts
import { MARK_BOXES, type MarkBox } from "@/lib/mark-boxes";
```

(الاستيراد الحالي `import { MARK_BOXES } from "@/lib/mark-boxes";` — يُوسَّع
بالنوع فقط.)

وفي `teardown()` بعد `shards = []`:

```ts
      delete (window as unknown as { __MARK_BOXES?: readonly MarkBox[] })
        .__MARK_BOXES;
```

- [ ] **الخطوة ٣: تحقّق**

```bash
npx tsc --noEmit --pretty false; echo "tsc=$?"
```
المتوقّع: `tsc=0`.

ثم في اللوحة بعد `navigate` كامل:

```js
__audit.docks().expected
```
المتوقّع: `6`. و`fail` لم يعد يحوي «‎__MARK_BOXES غير منشور»، وبقي فيه
«الأهداف 0 والمتوقّع 6».

- [ ] **الخطوة ٤: الارتكاب (بطلب حسام)**

```bash
git add src/components/site/mark-morph.tsx
git commit -m "chore: نشر MARK_BOXES لحصّالة القياس"
```

---

## Task 3 — المهمّة ٣: الأهداف الستّة في `page.tsx`

**الملفات:**
- تعديل: `src/app/page.tsx` — ستّة عناصر

**الواجهات:**
- ينتج: ستّة عناصر تحمل `data-mark-dock="i"` و`data-mark-static`،
  نسبةُ كلٍّ منها نسبةَ ضلعه. تستهلكها المهمّة ٤.

الإسناد (من §٤ في الوثيقة) — **ليس بترتيب التمرير**:

| الموضع في `page.tsx` | الضلع | المقاس |
|---|---|---|
| ضربة «منذ 2013» (سطر 82) | `3` | `h-4 w-[13px]` |
| ضربة رأس `#pillars` (سطر 127) | `4` | `h-4 w-[18px]` |
| فاصل البطاقة، `index === 0` | `0` | `h-[27px] w-10` |
| فاصل البطاقة، `index === 1` | `1` | `h-[27px] w-10` |
| فاصل البطاقة، `index === 2` | `2` | `h-[27px] w-10` |
| ضربة رأس `#partners` (سطر 214) | `5` | `h-4 w-[18px]` |

- [ ] **الخطوة ١: عدّل ضربة «منذ 2013»**

استبدل (سطر 82–85):

```tsx
            <span
              aria-hidden
              className="mis-slant inline-block h-4 w-1 shrink-0 bg-accent"
            />
```

بـ:

```tsx
            {/* مرسى الضلع 3 — أنحف الأضلاع (نسبة 0.7994)، فهو الأنسب لضربةٍ
                رأسيّة سطريّة. العرض 13px = 16 × 0.7994. */}
            <span
              aria-hidden
              data-mark-dock="3"
              data-mark-static=""
              className="mis-slant inline-block h-4 w-[13px] shrink-0 bg-accent"
            />
```

- [ ] **الخطوة ٢: عدّل ضربة رأس `#pillars`**

استبدل (سطر 127–130):

```tsx
            <span
              aria-hidden
              className="mis-slant inline-block h-4 w-1 shrink-0 bg-accent"
            />
```

بـ:

```tsx
            {/* مرسى الضلع 4 — نسبة 1.1469، توأم الضلع 5 في رأس «شركاؤنا»
                فيقرأ الرأسان عائلةً واحدة. العرض 18px = 16 × 1.1469. */}
            <span
              aria-hidden
              data-mark-dock="4"
              data-mark-static=""
              className="mis-slant inline-block h-4 w-[18px] shrink-0 bg-accent"
            />
```

⚠️ النصّ المستبدَل مطابقٌ حرفيًّا لنصّ الخطوة ١ قبل تعديلها — تأكّد أنك في
`#pillars` (سطر 127) لا في `#about` (سطر 82).

- [ ] **الخطوة ٣: عدّل ضربة رأس `#partners`**

استبدل (سطر 214–217):

```tsx
              <span
                aria-hidden
                className="mis-slant inline-block h-4 w-1 shrink-0 bg-accent"
              />
```

بـ:

```tsx
              {/* مرسى الضلع 5 — نسبة 1.1469، توأم الضلع 4 في رأس «ما نقوم
                  عليه». العرض 18px = 16 × 1.1469. */}
              <span
                aria-hidden
                data-mark-dock="5"
                data-mark-static=""
                className="mis-slant inline-block h-4 w-[18px] shrink-0 bg-accent"
              />
```

⚠️ حشوةُ السطر هنا **أعمق بمسافتين** من الخطوتين ١ و٢ (العنصر داخل غلافين
إضافيين في `#partners`). طابِق الحشوة القائمة عند الاستبدال.

- [ ] **الخطوة ٤: عدّل فواصل البطاقات الثلاثة**

استبدل (سطر 169–172):

```tsx
                <span
                  aria-hidden
                  className="mis-slant mt-s4 inline-block h-1 w-10 shrink-0 bg-accent"
                />
```

بـ:

```tsx
                {/* مرسى الأضلاع 0 · 1 · 2 — نِسَبها متطابقة عمليًّا
                    (1.4932 · 1.4964 · 1.4932) فتبقى البطاقات الثلاث
                    متطابقة. الارتفاع 27px = 40 ÷ 1.4932؛ العرض 40px محفوظ
                    فلا يتزحزح شيءٌ أفقيًّا، ويزيد ارتفاع البطاقة ~23px. */}
                <span
                  aria-hidden
                  data-mark-dock={String(index)}
                  data-mark-static=""
                  className="mis-slant mt-s4 inline-block h-[27px] w-10 shrink-0 bg-accent"
                />
```

- [ ] **الخطوة ٥: تحقّق**

```bash
npx tsc --noEmit --pretty false; echo "tsc=$?"; npm run lint; echo "lint=$?"
```
المتوقّع: صفر وصفر.

ثم في اللوحة على 1280×800 بعد `navigate` كامل:

```js
__audit.docks()
```
المتوقّع: `found: 6` · كل `aspectErr ≤ 0.02` · و`fail` فارغة من أخطاء النسبة.
تبقى `dx/dy/dw/dh` غير صفرية — الأضلاع لم تُوجَّه بعد (المهمّة ٤).

- [ ] **الخطوة ٦: قِس أن البطاقات ما زالت متطابقة**

```js
[...document.querySelectorAll('#pillars li')].map(el => Math.round(el.getBoundingClientRect().height))
```
المتوقّع: ثلاث قيمٍ متساوية (`items-stretch` + `h-full`).

```js
[...document.querySelectorAll('#pillars li > div > span:first-child')]
  .map(el => Math.round(el.getBoundingClientRect().right))
```
المتوقّع: ثلاث قيمٍ متساوية — الرقيمات لم تتزحزح.

- [ ] **الخطوة ٧: الارتكاب (بطلب حسام)**

```bash
git add src/app/page.tsx
git commit -m "feat: ستّة مراسٍ لأضلاع العلامة في أقسام الرئيسية"
```

---

## Task 4 — المهمّة ٤: خطٌّ زمنيّ لكل ضلع

**الملفات:**
- تعديل: `src/components/site/mark-morph.tsx:62-137`

**الواجهات:**
- يستهلك: `data-mark-dock` من المهمّة ٣ · `window.__MARK_BOXES` من المهمّة ٢
- ينتج: كل ضلعٍ ينطبق على مرساه بخطأ 0px، وتجتمع الستّة في التذييل.

- [ ] **الخطوة ١: سجّل الرسوب**

```js
__audit.docks().rows.map(r => [r.dock, r.dx, r.dy, r.dw, r.dh])
```
المتوقّع: قيمٌ غير صفرية — الأضلاع ما زالت عند مرساة الواجهة.

- [ ] **الخطوة ٢: استبدل قراءة الخانات بقراءة المراسي**

في `place()`، استبدل:

```ts
      const slots = Array.from(document.querySelectorAll<HTMLElement>("[data-mark-slot]"));
```

بـ:

```ts
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
```

- [ ] **الخطوة ٣: استبدل `t1` المشترك بخطٍّ لكل ضلع**

استبدل:

```ts
      const rowsUsable = slots.length === MARK_POINTS.length;
      const rects = rowsUsable ? slots.map((s) => s.getBoundingClientRect()) : null;

      const t1 = rects ? ease(clamp((window.innerHeight - rects[0].top) / (window.innerHeight * 0.5))) : 0;
```

بـ:

```ts
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
```

- [ ] **الخطوة ٤: اجعل الاجتماع ينتظر رسوّ الجميع**

استبدل:

```ts
      const t2 =
        t1 < 1 && rects
          ? 0
          : ease(clamp(1 - remaining / (window.innerHeight * 0.42)));
```

بـ:

```ts
      /* لا يبدأ الاجتماع حتى يرسو **آخر** ضلع — وإلا انطلق المتقدّمون نحو
         التذييل بينما لم يبلغ المتأخّرون مراسيهم، فتُقرأ الحركة تشتّتًا. */
      const allDocked = !docksUsable || tDock.every((t) => t >= 1);
      const t2 = allDocked
        ? ease(clamp(1 - remaining / (window.innerHeight * 0.42)))
        : 0;
```

- [ ] **الخطوة ٥: بدّل مرجع الضلع في حلقة الرسم**

استبدل:

```ts
        const s = rects?.[i];

        const x = mix(s ? mix(ax, s.left, t1) : ax, cx, t2);
        const y = mix(s ? mix(ay, s.top, t1) : ay, cy, t2);
        const w = mix(s ? mix(aw, s.width, t1) : aw, cw, t2);
        const h = mix(s ? mix(ah, s.height, t1) : ah, ch, t2);
```

بـ:

```ts
        const s = docksUsable ? docks.get(i) : undefined;
        const t1i = tDock[i];

        const x = mix(s ? mix(ax, s.left, t1i) : ax, cx, t2);
        const y = mix(s ? mix(ay, s.top, t1i) : ay, cy, t2);
        const w = mix(s ? mix(aw, s.width, t1i) : aw, cw, t2);
        const h = mix(s ? mix(ah, s.height, t1i) : ah, ch, t2);
```

- [ ] **الخطوة ٦: احذف الاستيراد الميّت إن لزم**

`MARK_POINTS` ما زال مستعملًا في `build()` — **لا يُحذف**. تحقّق:

```bash
grep -n "MARK_POINTS" src/components/site/mark-morph.tsx
```
المتوقّع: سطر الاستيراد وسطرٌ داخل `build()`.

- [ ] **الخطوة ٧: تحقّق**

```bash
npx tsc --noEmit --pretty false; echo "tsc=$?"; npm run lint; echo "lint=$?"; npm run build 2>&1 | grep -E "✓ Compiled|Error|Failed"
```
المتوقّع: صفر · صفر · `✓ Compiled`.

ثم في اللوحة على 1280×800، مرّر حتى يظهر كل هدفٍ ثم قِس:

```js
__audit.docks().rows.map(r => [r.dock, r.dx, r.dy, r.dw, r.dh])
```
المتوقّع: `0,0,0,0` لكل ضلعٍ بلغ مرساه.

وعند القاع:

```js
scrollTo(0, document.documentElement.scrollHeight); __audit.morph()
```
المتوقّع: `vsFoot: 0`.

- [ ] **الخطوة ٨: الارتكاب (بطلب حسام)**

```bash
git add src/components/site/mark-morph.tsx
git commit -m "feat: خطٌّ زمنيّ مستقلّ لكل ضلع نحو مرساه"
```

---

## Task 5 — المهمّة ٥: بوابة التغطية والتدهور الآمن

**الملفات:**
- تعديل: `scripts/audit.js` — توسيع `coverage()` بعيّنةٍ كثيفة على الشكل

**الواجهات:**
- يستهلك: كل ما سبق
- ينتج: `__audit.sweep(n)` تُرجع أسوأ نسبة تغطيةٍ عبر `n` نقطة تمرير.

- [ ] **الخطوة ١: أضِف المسح الكثيف**

في `scripts/audit.js` بعد `docks()`:

```js
  /* ٦) مسحٌ عبر التمرير: التغطية تُقاس على **شكل** المتوازي لا صندوقه، لأن
     `coverage()` تسأل عمّا فوق النصّ والأضلاع تحته فتمرّ دائمًا. */
  function sweep(points) {
    var n = points || 61;
    var layer = document.querySelector('[data-mark-layer]');
    var svgs = layer ? layer.querySelectorAll('svg') : [];
    var polys = layer ? layer.querySelectorAll('polygon') : [];
    var max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    var worst = { pct: 0, y: 0, text: null };
    function inAny(cx, cy) {
      for (var k = 0; k < polys.length; k++) {
        var p = polys[k], ctm = p.getScreenCTM();
        if (!ctm) continue;
        var pt = (p.ownerSVGElement || svgs[0]).createSVGPoint();
        pt.x = cx; pt.y = cy;
        var l = pt.matrixTransform(ctm.inverse());
        try { if (p.isPointInFill(l)) return true; } catch (e) { /* بلا دعم */ }
      }
      return false;
    }
    for (var s = 0; s <= n; s++) {
      window.scrollTo(0, Math.round((max * s) / n));
      var els = document.querySelectorAll('main h1, main h2, main h3, main p, main li');
      for (var e = 0; e < els.length; e++) {
        var r = els[e].getBoundingClientRect();
        if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > window.innerHeight) continue;
        var on = 0, tot = 0;
        for (var i = 0; i <= 40; i++) {
          for (var j = 0; j <= 12; j++) {
            var x = r.left + (r.width * i) / 40, y = r.top + (r.height * j) / 12;
            if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue;
            tot++; if (inAny(x, y)) on++;
          }
        }
        var pct = tot ? (100 * on) / tot : 0;
        if (pct > worst.pct) {
          worst = { pct: +pct.toFixed(2), y: window.scrollY,
                    text: els[e].textContent.trim().slice(0, 30) };
        }
      }
    }
    return { points: n + 1, worst: worst, pass: worst.pct === 0 };
  }
```

وسجّلها في `all()` كـ`sweep: sweep()`.

- [ ] **الخطوة ٢: شغّل المسح على العروض الستّة**

لكل عرضٍ من 320 · 390 · 640 · 767 · 768 · 1280 وفي الوضعين:
اضبط المقاس ← `navigate` ← انتظر الاستقرار ← `__audit.sweep(61)`.

المتوقّع: `pass: true` و`worst.pct === 0` في الاثني عشر.
أي رسوبٍ يُعالَج بتعديل مسار الضلع أو مقاس هدفه — **لا** بتخفيف العيّنة.

- [ ] **الخطوة ٣: تحقّق من التدهور الآمن**

```js
document.documentElement.classList.remove('mark-morphing');
[...document.querySelectorAll('[data-mark-dock]')].map(el => ({
  dock: el.dataset.markDock,
  vis: getComputedStyle(el).visibility,
  w: Math.round(el.getBoundingClientRect().width),
  h: Math.round(el.getBoundingClientRect().height)
}))
```
المتوقّع: ستّة عناصر · `vis: "visible"` · بمقاساتها من المهمّة ٣.
ثم أعِد الصنف: `document.documentElement.classList.add('mark-morphing')`.

- [ ] **الخطوة ٤: تحقّق من قاعدة العدد**

```js
const el = document.querySelector('[data-mark-dock="5"]');
const keep = el.dataset.markDock; delete el.dataset.markDock;
window.dispatchEvent(new Event('resize'));
await new Promise(r => setTimeout(r, 900));
const out = __audit.morph();
el.dataset.markDock = keep;
out
```
المتوقّع: الأضلاع تنتقل من الواجهة إلى التذييل مباشرةً بلا محطّات — أي
`vsHero: 0` عند القمّة و`vsFoot: 0` عند القاع، والطبقة **مرئيّة** لا مخفيّة.

- [ ] **الخطوة ٥: تحقّق نهائي**

```bash
npx tsc --noEmit --pretty false; echo "tsc=$?"; npm run lint; echo "lint=$?"; npm run build 2>&1 | grep -E "✓ Generating|Error|Failed"
```
المتوقّع: صفر · صفر · `✓ Generating static pages ... (24/24)`.

ولا تمرير أفقي على أي عرض:

```js
document.documentElement.scrollWidth - document.documentElement.clientWidth
```
المتوقّع: `0` (عدا الفائض السابق 22px على 320 — مُثبت أنه سابقٌ لهذا العمل).

- [ ] **الخطوة ٦: الارتكاب (بطلب حسام)**

```bash
git add scripts/audit.js
git commit -m "test: مسحٌ كثيف للتغطية عبر التمرير على شكل المتوازي"
```

---

## تغطية معايير القبول (§١١ من الوثيقة)

| المعيار | المهمّة |
|---|---|
| ١ انطباق 0px على المرسى | ٤ خطوة ٧ |
| ٢ زاوية 24.32° | مضمونةٌ بالبناء: نسبة الهدف = نسبة الضلع ⇒ تحجيمٌ متجانس (المهمّة ١ تقيس `aspectErr ≤ 0.02`) |
| ٣ صفر تغطية · 61 نقطة × ٦ عروض × وضعين | ٥ خطوة ٢ |
| ٤ تطابق البطاقات وتشتّت الرقيمات 0px | ٣ خطوة ٦ |
| ٥ اجتماع 0px عند القاع | ٤ خطوة ٧ |
| ٦ سلامة الحالة بلا JS | ٥ خطوة ٣ |
| ٧ تباين الأهداف فوق 3:1 | ثابتٌ بلا تغيير: الأهداف `bg-accent` والأضلاع `--mark-quiet` — كلاهما مقيسٌ اليوم فوق 9:1 |
| ٨ لا تمرير أفقي · بناءٌ نظيف | ٥ خطوة ٥ |
