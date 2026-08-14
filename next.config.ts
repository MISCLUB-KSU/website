import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /**
       * حدّ جسم الطلب الافتراضي ميجابايت واحد، وهو أقلّ من سقف المرفقات.
       * بدون رفعه يُرفض الطلب في طبقة `Next` قبل أن يصل إلى تحقّقنا، فيرى
       * الطالب عطلًا عامًّا بدل رسالة تقول له إن ملفه كبير.
       *
       * ⚠️ **الرقم محسوبٌ لا مُختار — ومصدرُه `UPLOAD_BUDGET_BYTES`:**
       *     السيرة الذاتية      ٥ ميجا  (`CV_MAX_BYTES`)
       *   + المشاريع السابقة    ٥       (`PROJECTS_MAX_BYTES`)
       *   + ٣ مرفقاتِ أسئلة × ٢ = ٦     (`MAX_ANSWER_FILES` × `ANSWER_FILE_MAX_BYTES`)
       *   ────────────────────────────
       *     الميزانية          ١٦ ميجا
       *   + زوائد `multipart` وبقيّة الحقول ≈ ١
       *   = ١٧
       *
       * ⚠️ **لا يُستورَد الثابت هنا:** ملفّ الإعداد يُحمَّل قبل مسارات
       * `tsconfig`، فاستيراد `@/lib/registration` يكسر البناء. فإن تغيّر
       * أحدُ الثلاثة وجب تغييرُ هذا الرقم معه — وهو مذكورٌ عندها هناك.
       */
      bodySizeLimit: "17mb",
    },
  },
};

export default nextConfig;
