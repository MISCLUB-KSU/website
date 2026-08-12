import type { Metadata } from "next";

import { PREFERENCE_VALUES } from "@/content/preferences";
import { RegistrationForm } from "./registration-form";

export const metadata: Metadata = {
  title: "انضم إلينا",
  description:
    "قدّم على عضوية نادي نظم المعلومات الإدارية بجامعة الملك سعود، واختر اللجنة أو الوحدة التي تناسب مهاراتك.",
  alternates: { canonical: "/join" },
};

/**
 * ⚠️ **`?choice=` كان يُقرأ من لا أحد.** `joinHref` في صفحات اللجان يبني
 * `‎/join?choice=committee:media/design`، و`RegistrationForm` يقبل
 * `initialChoice` ويوثّقها «مُهيَّأة من صفحة اللجنة» — لكن الصفحة بينهما
 * لم تكن تقرأ الوسيط ولا تمرّره. فكلُّ زرّ «قدِّم على هذي الوحدة» (تسعُ
 * وحداتٍ وثلاثُ لجانٍ بلا وحدات) يُنزل الطالبَ على نموذجٍ **فارغ** —
 * وصفحةُ اللجنة تعده سطرًا فوق الزرّ: «يفتح النموذج وخيارها مُهيَّأ».
 *
 * ⚠️ **وتُفحص القيمة هنا لا يُوثَق بها.** ما يكتبه الزائر في العنوان يصل
 * حقلَ `choice1`؛ ولولا المطابقة على `PREFERENCE_VALUES` لظهر للطالب خطأٌ
 * على رغبةٍ لم يخترها. والخادمُ يفحصها ثانيةً على كل حال.
 *
 * ⚠️ **وقراءةُ الوسيط تجعل الصفحة ديناميّة** بعد أن كانت مُهيّأةً سلفًا.
 * مقبولٌ هنا: صفحةُ نموذجٍ لا تُخدَم من ذاكرةٍ وسيطة أصلًا، وثمنُها أهونُ
 * من وعدٍ مكتوبٍ لا يُنفَّذ.
 */
type JoinPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const raw = (await searchParams).choice;
  const wanted = typeof raw === "string" ? raw : undefined;
  const initialChoice =
    wanted && PREFERENCE_VALUES.includes(wanted) ? wanted : undefined;

  return <JoinPageBody initialChoice={initialChoice} />;
}

function JoinPageBody({ initialChoice }: { initialChoice?: string }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-14 sm:py-20">
      <header className="mb-10 max-w-2xl">
        {/* الميلان مأخوذ من الشعار — عنصر واحد بارز في الشاشة لا أكثر */}
        <span className="mis-slant bg-deep mb-4 inline-block px-7 py-1.5">
          <span className="text-snow text-[0.7rem] font-semibold tracking-widest">
            عضوية النادي
          </span>
        </span>
        <h1 className="text-ink-label mb-3 text-3xl leading-tight font-bold sm:text-4xl">
          انضم إلى النادي
        </h1>
        <p className="text-fg-muted max-w-[56ch] leading-relaxed">
          ثلاث خطوات: بياناتك، ثم ثلاث رغبات ترتّبها بعد قراءة عمل كل لجنة
          ومشروع، ثم أسئلة قادتها. نراجع الطلبات ونرسل النتيجة على بريدك خلال
          أسبوع.
        </p>
      </header>

      <RegistrationForm initialChoice={initialChoice} />
    </main>
  );
}
