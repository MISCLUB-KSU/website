# نادي نظم المعلومات الإدارية — جامعة الملك سعود

موقع النادي: Next.js (App Router) + TypeScript + Tailwind v4، عربيّ `dir="rtl"`.

> القواعد الشخصية والفريق والوكلاء في `~/.claude/CLAUDE.md` — هذا الملفّ
> **لا يكرّرها**، ويقتصر على ما يخصّ هذا المستودع وحده.

## قواعد هذا المستودع

- **RTL:** الصفحات `dir="rtl" lang="ar"`. كل نصّ لاتيني أو رقمٍ أو رمزٍ
  برمجيّ يُغلَّف `dir="ltr" lang="en"` أو يمرّ عبر `isolateLatin` من
  `@/lib/bidi` — وإلّا انعكس بصريًّا. هذا أكثر عطلٍ تكرارًا هنا.
- **الميلان توقيعٌ لا خلفية:** لا يُستعمل إلّا في مواضعَ معدودة في الشاشة
  الواحدة. راجع `brand/v2/BRIEF.md`.
- **الأصناف المفقودة:** استرجاعُ المستودع أسقط أصنافًا من `globals.css`
  والمكوّنات توثّقها على أنها هناك. قبل نسبةِ أي خللٍ بصريّ إلى التصميم،
  تحقّق أن الصنف معرَّف: `grep -E "^\.<name>[[:space:],:{>]" src/app/globals.css`.
- **العلامات التجارية:** لا يُعاد تلوين شعار شريكٍ ولا يُعكس. النسخة
  الداكنة تُطلب رسميًّا من الجهة. الاستثناء القائم موثَّقٌ في
  `src/content/about.ts` عند تعريف `logoDark`.
- **التباين يُقاس في الوضعين:** الفحص في وضعٍ واحد يكذب — عطلٌ كثيرٌ هنا
  نجح نهارًا مصادفةً وسقط ليلًا.

## أوامر

```bash
npm run dev     # التطوير
npx tsc --noEmit && npm run lint    # قبل أي commit
```

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
