import type { Metadata } from "next";
import { RegistrationForm } from "./registration-form";

export const metadata: Metadata = {
  title: "انضم إلينا",
  description:
    "قدّم على عضوية نادي نظم المعلومات الإدارية بجامعة الملك سعود، واختر اللجنة أو الوحدة التي تناسب مهاراتك.",
  alternates: { canonical: "/join" },
};

export default function JoinPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-14 sm:py-20">
      <header className="mb-10">
        {/* الميلان مأخوذ من الشعار — عنصر واحد بارز في الشاشة لا أكثر */}
        <span className="mis-slant bg-deep mb-4 inline-block px-7 py-1.5">
          <span className="text-snow text-[0.7rem] font-semibold tracking-widest">
            عضوية النادي
          </span>
        </span>
        <h1 className="text-deep mb-3 text-3xl leading-tight font-bold sm:text-4xl">
          انضم إلى النادي
        </h1>
        <p className="text-fg-muted max-w-[56ch] leading-relaxed">
          ثلاث خطوات: بياناتك، ثم ثلاث رغبات ترتّبها بعد قراءة عمل كل لجنة
          ومشروع، ثم أسئلة قادتها. نراجع الطلبات ونرسل النتيجة على بريدك خلال
          أسبوع.
        </p>
      </header>

      <RegistrationForm />
    </main>
  );
}
