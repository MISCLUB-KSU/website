"use client";

import { useEffect, useRef } from "react";

import type { PersonView } from "@/components/leadership/person-context";

import "./person-dialog.css";

/**
 * لوحُ الشخص — `<dialog>` أصليّ واحدٌ مشترك، لا واحدٌ لكلِّ عقدة.
 *
 * ⚠️ **لماذا `<dialog>` لا نافذةٌ معلّقة ولا توسّعٌ سطريّ:**
 * · التوسّعُ السطريّ يغيّر تدفّقَ المستند، فتنزاح كلُّ الأعمدة تحته ويقفز
 *   المخطّط تحت إصبع القارئ.
 * · أيُّ `position: fixed` داخل شجرةٍ فيها تحويلُ Motion يُثبَّت على
 *   **العنصر المتحوّل** لا على الشاشة — لأن التحويل ينشئ containing block.
 *   والطبقةُ العليا (top layer) للـ`dialog` تنجو من هذا كلِّه.
 * · وتأتي معه مجّانًا: حصرُ البؤرة، وEsc، والخلفيةُ العازلة.
 *
 * ⚠️ **ويُركَّب خارج `.org-field`.** الخصائصُ المخصّصة تُورَّث بشجرة الـDOM
 * حتى للطبقة العليا؛ ولو بقي داخل الحقل الحبريّ لورث نصًّا ثلجيًّا ووضعه
 * على لوحٍ فاتح — أبيضُ على أبيض. فألوانُه من رموز الصفحة العادية،
 * وتنقلب مع الوضع كبقيّة الموقع. المُركِّب في `chart.tsx` يضمن ذلك.
 *
 * وإعادةُ البؤرة إلى الزرّ الفاتح مكتوبةٌ صراحةً في `chart.tsx`.
 */

/** لا يُعرض رابطٌ إلّا إن كان `https` صريحًا — حارسٌ رخيص ضدّ `javascript:` */
function safeHttpsUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.href : undefined;
  } catch {
    return undefined;
  }
}

type PersonDialogProps = {
  view: PersonView | null;
  onClose: () => void;
};

export function PersonDialog({ view, onClose }: PersonDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (view && !dialog.open) {
      dialog.showModal();
      return;
    }

    if (!view && dialog.open) {
      dialog.close();
    }
  }, [view]);

  const linkedin = safeHttpsUrl(view?.person.linkedin);

  return (
    <dialog
      ref={dialogRef}
      className="org-dialog"
      aria-labelledby="org-dialog-name"
      /* يلتقط الإغلاق بـEsc وبالضغط على الخلفية، فتبقى الحالة متّسقة مع الـDOM */
      onClose={onClose}
      /* ⚠️ `<dialog>` المفتوح بـ`showModal()` **لا يُغلق بالضغط على
         الخلفية تلقائيًّا** — خلافًا لتوقّع كل مستخدم. والضغطةُ على
         `::backdrop` تُرسَل إلى عنصر `dialog` نفسِه، فمساواةُ الهدف به
         تميّز الخلفية عن اللوح. بدون هذا يبقى اللوح عالقًا إلّا بـEsc أو
         بزرّ الإغلاق. */
      onClick={(event) => {
        if (event.target === dialogRef.current) dialogRef.current.close();
      }}
    >
      {view ? (
        <div className="org-dialog-panel">
          <div className="flex items-start justify-between gap-s4">
            <div>
              <span className="org-dialog-tick" aria-hidden />
              <p className="org-dialog-role">{view.person.role}</p>
              <h2 id="org-dialog-name" className="org-dialog-name">
                {view.person.name}
              </h2>
            </div>

            <button
              type="button"
              className="org-dialog-close"
              onClick={() => dialogRef.current?.close()}
            >
              <span className="sr-only">إغلاق</span>
              <svg
                viewBox="0 0 20 20"
                width="18"
                height="18"
                aria-hidden
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M4 4l12 12M16 4L4 16" />
              </svg>
            </button>
          </div>

          <p className="org-dialog-path">
            {view.path.map((step, index) => (
              <span key={step}>
                {index > 0 ? (
                  <span aria-hidden className="mx-s2">
                    ←
                  </span>
                ) : null}
                {step}
              </span>
            ))}
          </p>

          {linkedin ? (
            <a
              className="org-linkedin"
              href={linkedin}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>لينكدإن</span>
              <svg
                viewBox="0 0 20 20"
                width="14"
                height="14"
                aria-hidden
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M12 3h5v5M17 3l-8 8M15 12v4a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1h4" />
              </svg>
              <span className="sr-only">يفتح في نافذة جديدة</span>
            </a>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}
