import type { Metadata } from "next";

import { SiteHeader } from "@/components/site/site-header";
import { VariantsPreview } from "@/components/leadership/variants/preview";
import { newestTerm } from "@/content/leadership";

import "@/components/leadership/variants/variants.css";

/**
 * صفحةُ اختيار النسخة — مؤقّتة.
 *
 * ⚠️ **تُحذف هي ومجلّد `components/leadership/variants/` بعد أن يختار
 * حسام.** غرضُها إنهاءُ دورة التخمين: ثلاثُ نسخٍ حيّةٍ بالبيانات نفسها
 * بدل وصفٍ نصّيّ.
 *
 * و`noindex` لأنها ليست صفحةَ محتوًى: لا تدخل الخريطة ولا نتائج البحث.
 */
export const metadata: Metadata = {
  title: "اختيار نسخة الهيكل القيادي",
  robots: { index: false, follow: false },
};

export default function StructurePreviewPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <VariantsPreview term={newestTerm()} />
      </main>
    </>
  );
}
