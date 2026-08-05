import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /**
       * حدّ جسم الطلب الافتراضي ميجابايت واحد، وهو أقلّ من سقف مرفق
       * السيرة الذاتية (خمسة ميجابايت في `CV_MAX_BYTES`). بدون رفعه يُرفض
       * الطلب في طبقة `Next` قبل أن يصل إلى تحقّقنا، فيرى الطالب عطلًا
       * عامًّا بدل رسالة تقول له إن ملفه كبير.
       *
       * ستة: خمسة للملف، والباقي لبقية الحقول ولزوائد `multipart`.
       */
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
