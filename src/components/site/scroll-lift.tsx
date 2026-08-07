"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * يرفع الشريط إلى حالته الزجاجية حين يبدأ المحتوى بالمرور تحته.
 *
 * لماذا حالتان لا حالة واحدة: أعلى الصفحة لا شيء خلف الشريط، فأرضيةٌ
 * وحدٌّ هناك زينةٌ تفصل الشريط عن صفحته بلا سبب. وحين يمرّ المحتوى تحته
 * يصير الفصل وظيفة: بدونه يختلط النصّان.
 *
 * الغلاف وحده عميل — الروابط تبقى مُصيَّرة على الخادم داخل `children`،
 * فلا تُشحن بيانات التنقّل إلى المتصفح لأجل رقمٍ واحد هو موضع التمرير.
 *
 * بلا جافاسكربت يبقى الشريط في حالته الشفافة: مقروءًا في أعلى الصفحة،
 * وهو موضعه الافتراضي — ولا يُخفى منه شيء في أي حال.
 */

/** ثمان بكسلات: أقلّ حركة تعني أن المحتوى بدأ يمرّ فعلًا تحت الشريط */
const LIFT_AFTER = 8;

type ScrollLiftProps = {
  className: string;
  children: ReactNode;
};

export function ScrollLift({ className, children }: ScrollLiftProps) {
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    const read = () => setLifted(window.scrollY > LIFT_AFTER);

    /* ⚠️ **مخنوقٌ بـ`requestAnimationFrame`.** كان `read` يُستدعى مباشرةً على
       كل حدث تمرير، وأحداث التمرير تنهمر أسرع من إطار الرسم — فتتكدّس
       استدعاءات `setState` وتُجبر المتصفّح على حسابٍ متكرّر. الحارس `frame`
       يجعل القراءة **مرّةً واحدة لكل إطار** مهما انهمرت الأحداث.
       والقاعدة من مهارة التصميم (B7): لا مستمعَ تمريرٍ غيرَ مخنوق. */
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        read();
      });
    };

    window.addEventListener("scroll", schedule, { passive: true });
    /* إطارٌ واحد بعد التركيب: المتصفح يستعيد موضع التمرير المحفوظ بعد
       الرسم الأول، فالقراءة الفورية تُرجع صفرًا على صفحة مفتوحة في وسطها. */
    const first = requestAnimationFrame(read);

    return () => {
      cancelAnimationFrame(first);
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
    };
  }, []);

  return (
    <div className={className} data-lifted={lifted ? "" : undefined}>
      {children}
    </div>
  );
}
