import type { Metadata } from "next";
import Link from "next/link";

import { FaqList } from "@/components/site/faq-list";
import { PageHeader } from "@/components/site/page-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { FAQ } from "@/content/faq";

export const metadata: Metadata = {
  title: "الأسئلة الشائعة",
  description:
    "أجوبة عن أكثر ما يُسأل عن عضوية نادي نظم المعلومات الإدارية بجامعة الملك سعود: من يقدر ينضم، متى يفتح التقديم، وكيف تُختار الرغبات.",
  alternates: { canonical: "/faq" },
};

/**
 * الأسئلة الشائعة.
 *
 * الأجوبة **ظاهرة كلها** لا مطويّة خلف أكورديون: الطالب يبحث في الصفحة
 * بـ Ctrl+F، والمطويّ لا يُلتقط بالبحث ولا يُقرأ بمسحة عين واحدة.
 * وكل سؤال مرساة قائمة بذاتها، فيمكن مشاركة رابط الجواب وحده.
 */
export default function FaqPage() {
  return (
    <>
      <SiteHeader />

      <main>
        <PageHeader
          id="faq"
          title="الأسئلة الشائعة"
          lede="ما يُسأل عنه أكثر من غيره — بجواب مباشر، لا بإحالة إلى جهة أخرى."
        />

        <div className="mx-auto max-w-6xl px-s4 py-s8 sm:px-s7">
          <div className="max-w-3xl">
            <FaqList items={FAQ} openFirst />
          </div>

          <p className="mt-s8 max-w-measure border-t border-line pt-s5 text-sm leading-relaxed text-fg-muted">
            سؤالك ليس هنا؟{" "}
            <Link
              href="/contact"
              className="font-medium text-accent underline decoration-line-control underline-offset-4 transition-colors hover:text-accent-hover hover:decoration-current"
            >
              اكتب لنا
            </Link>{" "}
            — ونضيف الجواب إلى هذي الصفحة إن تكرّر السؤال.
          </p>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
