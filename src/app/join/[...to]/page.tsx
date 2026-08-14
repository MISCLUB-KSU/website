import type { Metadata } from "next";
import Link from "next/link";

import { findDirectTarget } from "@/content/preferences";
import { RegistrationForm } from "../registration-form";

/**
 * التقديم المباشر — `‎/join/project/misthon` أو `‎/join/committee/media/design`.
 *
 * قائدٌ عنده جمهورٌ خارج النادي يرسل الرابط، فيفتح تقديمَ جهته وحدها بلا
 * خطوة «اختر ثلاث رغبات». وطلبُه يُوسَم `source = 'direct'` في القاعدة —
 * ولولا الوسم لبدت جهةٌ استقطبت عشرين برابطها **أكثرَ جهةٍ مطلوبة في
 * النادي**، وهم لم يفاضلوا أصلًا.
 *
 * ⚠️ **المسار لا يُركَّب منه قيمةُ رغبة.** `findDirectTarget` يبحث عن جهةٍ
 * قيمتُها تطابق **ويشترط رايتَها مرفوعة** — فما لا يُطابق لا يمرّ، ولا يصير
 * ما يكتبه الزائر في العنوان قيمةً تدخل القاعدة.
 */

type Params = { params: Promise<{ to: string[] }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const target = findDirectTarget((await params).to);
  return target
    ? {
        title: `التقديم على ${target.fullLabel}`,
        description: target.description,
        /* ⚠️ `noindex`: الرابط موجَّهٌ لجمهور قائدٍ بعينه، وفهرستُه تجعله
           بابًا عامًّا موازيًا للنموذج الرسميّ فتنقسم الطلبات بلا قصد. */
        robots: { index: false, follow: false },
      }
    : { title: "رابط غير معروف", robots: { index: false } };
}

export default async function DirectJoinPage({ params }: Params) {
  const target = findDirectTarget((await params).to);

  /* ⚠️ صفحةُ خطأٍ صريحة لا تحويلٌ صامت: قائدٌ أخطأ حرفًا في رابطه لن يعرف
     أبدًا لو حوّلناه بصمتٍ إلى النموذج العامّ — وسيظنّ أن رابطه يعمل. */
  if (!target) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-20 text-center">
        <h1 className="text-fg mb-3 text-2xl font-bold">هذا الرابط لا يعمل</h1>
        <p className="text-fg-muted mx-auto mb-8 max-w-[46ch] leading-relaxed">
          الرابط لا يشير إلى جهةٍ تقبل التقديم المباشر — قد يكون قديمًا أو فيه
          خطأ مطبعيّ. تقدر تقدّم على النموذج العامّ وترتّب رغباتك الثلاث.
        </p>
        <Link
          href="/join"
          className="bg-deep text-snow inline-block px-s6 py-s3 font-semibold"
        >
          التقديم على العضوية
        </Link>
      </main>
    );
  }

  /* ⚠️ **`max-w-5xl` كالنموذج العامّ لا `max-w-2xl`.** كُتبت هذي الصفحة حين
     كان الرابط المباشر نموذجًا نحيلًا بحقولٍ قليلة، ثم صار يحمل **النموذج
     نفسَه** بعمودَيه (الحقول وبطاقة الطلب الملتصقة) وأسئلةَ القائد ببطاقات
     اختيار. فبقي السقف 672px، ومقيسٌ ما نتج عنه: عمودُ الحقول **296px**
     وبطاقةُ الاختيار داخله **125px** — عرضٌ لا يسع بندًا واحدًا من
     مسؤوليات الوحدة. */
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-14 sm:py-20">
      <header className="mb-10">
        <span className="mis-slant bg-deep mb-4 inline-block px-7 py-1.5">
          <span className="text-snow text-[0.7rem] font-semibold tracking-widest">
            تقديمٌ مباشر
          </span>
        </span>
        <h1 className="text-fg mb-3 text-3xl leading-tight font-bold sm:text-4xl">
          {target.fullLabel}
        </h1>
        <p className="text-fg-muted mb-4 max-w-[56ch] leading-relaxed">
          {target.description}
        </p>
        <p className="text-fg-muted max-w-[56ch] leading-relaxed">
          هذا الرابط للتقديم على هذي الجهة وحدها — خطوتان: بياناتك، ثم أسئلتها.
          وإن كنت تفضّل ترتيب ثلاث رغبات،{" "}
          <Link href="/join" className="text-accent font-semibold underline">
            قدّم على النموذج العامّ
          </Link>
          .
        </p>
      </header>

      <RegistrationForm lockedTo={target.value} lockedLabel={target.fullLabel} />
    </main>
  );
}
