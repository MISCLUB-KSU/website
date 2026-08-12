import next from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * إعداد ESLint — **قواعد Next وTypeScript كاملة**.
 *
 * ⚠️ **كان فارغًا يفحص صفرَ ملفّ.** الإعداد السابق مصفوفةٌ فيها `ignores`
 * وحدها، فكان `npm run lint` يمرّ دائمًا بلا استثناء — وهو أسوأ من غيابه:
 * بوّابةٌ خضراءُ أبدًا تُقرأ ضمانًا وليست ضمانًا. وسببُ تفريغه أن الحزم
 * ظُنّت غير مثبَّتة، وهي مثبَّتةٌ كلُّها (`eslint-config-next` وتوابعُه).
 *
 * ⚠️ **بلا فحصٍ نوعيّ (`projectService`).** `tsc --noEmit` يفحص الأنواع
 * كاملةً في المستودع، وتشغيلُ برنامج TypeScript ثانيةً داخل ESLint يضاعف
 * الزمن بلا كشفٍ جديد. فقواعد النوع هنا نحويّةٌ فقط.
 */
const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "**/*.generated.*",
      /* نسخةٌ محفوظةٌ من الواجهة القديمة — تُقرأ مرجعًا ولا تُبنى */
      "_old_ui/**",
      "scripts/**",
      /* ⚠️ **نسخُ الوكلاء العاملة.** `.claude/worktrees/` نسخٌ كاملةٌ من
         المستودع تُنشئها الوكلاء، ففحصُها يضاعف كلَّ مخالفةٍ ثلاثًا ويشير
         إلى ملفّاتٍ لا يملكها أحد. وهي في `.gitignore` أصلًا. */
      ".claude/**",
    ],
  },

  ...next,
  ...nextTypescript,

  {
    rules: {
      /* ⚠️ **المتغيّر غير المستعمل خطأٌ لا تنبيه.** الاسترجاع خلّف
         استيراداتٍ لمكوّناتٍ لم تعد تُرسم، وهي تكذب على القارئ: يظنّ
         الملفَّ يستعمل ما لا يستعمله. والبادئة `_` مخرجٌ صريحٌ لمن أراد. */
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      /* الشرطُ المعلَّق (`&&`) داخل JSX يُكتب كثيرًا، ونسيانُ استدعاءِ
         دالّةٍ يبدو مثله تمامًا — فيُطلب الاستدعاء صراحةً. */
      "@typescript-eslint/no-unused-expressions": [
        "error",
        { allowShortCircuit: true, allowTernary: true },
      ],

      /* ⚠️ **الاعتماديّاتُ الناقصة خطأٌ هنا.** الموقع مليءٌ بحالةٍ مقادةٍ
         بالتمرير و`IntersectionObserver`، وإغلاقةٌ قديمة فيها لا تُرى في
         المعاينة — تظهر بعد تبديل ثيمٍ أو تغيير مقاسٍ في منتصف الجلسة. */
      "react-hooks/exhaustive-deps": "error",
    },
  },

  {
    /* ملفّات المحتوى بياناتٌ صِرفة — لا JSX فيها ولا خطافات، ولا يُطبَّق
       عليها ما وُضع للمكوّنات. */
    files: ["src/content/**/*.ts"],
    rules: { "react-hooks/exhaustive-deps": "off" },
  },
];

export default config;
