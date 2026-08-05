import { Fragment, type ReactNode } from "react";

/**
 * يعزل كل مقطع لاتيني أو رقمي داخل نص عربي.
 *
 * لماذا أداةٌ بدل عزل يدوي في المحتوى: هذا أكثر خطأ يتكرّر في واجهات `RTL`،
 * ويعتمد على تذكّر كاتب المحتوى في كل مرة. والمحتوى هنا منقول حرفيًا من
 * مصادر رسمية (رؤى ورسائل ووصف برامج) فلا يُعاد صياغته لتفادي المشكلة.
 *
 * بلا عزل ينعكس ترتيب المقطع داخل الجملة، وتتحوّل الأرقام إلى هندية.
 *
 *   isolateLatin('أن يكون MISology المرجع الأول')
 *   → أن يكون <span dir="ltr">MISology</span> المرجع الأول
 */
const LATIN_RUN = /([A-Za-z][A-Za-z0-9._@&+/-]*|\d[\d.,:/-]*\d|\d)/g;

export function isolateLatin(text: string): ReactNode {
  const parts = text.split(LATIN_RUN);
  if (parts.length === 1) return text;

  return parts.map((part, index) =>
    // المقاطع الفردية هي ما التقطه التعبير النمطي — أي المقاطع اللاتينية
    index % 2 === 1 ? (
      <span key={`${part}-${index}`} dir="ltr">
        {part}
      </span>
    ) : (
      <Fragment key={`${part}-${index}`}>{part}</Fragment>
    ),
  );
}
