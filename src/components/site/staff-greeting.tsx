"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * ترحيبُ الشريط — يظهر للقائد الداخل وحده، وطريقٌ إلى اللوحة من أي صفحة.
 *
 * ⚠️ **يُسأل في المتصفّح لا على الخادم.** قراءةُ الجلسة في الصفحة تحوّلها
 * من ثابتةٍ إلى مبنيّةٍ لكل طلب — فيبطؤ الموقع على كل الطلاب لأجل سطرٍ
 * يراه القادة. فالصفحةُ تبقى ثابتة، والسؤال يقع بعد التحميل.
 *
 * ⚠️ **ولا يحجز مكانًا قبل أن يعرف.** لا هيكلَ تحميلٍ ولا مساحةٌ محفوظة:
 * أكثرُ من يمرّ زائرٌ لا جلسة له، فحجزُ مكانٍ يزيح الشريط عند كل زيارة —
 * وهو `CLS` مقابل لا شيء. ومن له اسمٌ يظهر سطرُه بلا إزاحةٍ تُذكر لأنه
 * في طرفٍ مرن.
 *
 * ⚠️ **ولا يُعرض شيءٌ عند الفشل.** انقطاعُ الشبكة أو ردٌّ غير متوقَّع
 * يُترك صامتًا: هذا سطرُ راحةٍ لا وظيفةٌ يُنتظر منها جواب.
 */
export function StaffGreeting({ className = "" }: { className?: string }) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    /* يُلغى عند التفكيك حتى لا تُضبط الحالة على مكوّنٍ رحل */
    const stop = new AbortController();

    fetch("/api/me", { signal: stop.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { name?: string | null } | null) => {
        if (typeof data?.name === "string") setName(data.name);
      })
      .catch(() => {
        /* صامتٌ عمدًا — انظر رأس الملفّ */
      });

    return () => stop.abort();
  }, []);

  if (!name) return null;

  return (
    <Link
      href="/admin"
      className={`text-fg-muted hover:text-fg inline-flex min-h-11 items-center whitespace-nowrap text-sm transition-colors ${className}`}
    >
      أهلًا {name}
    </Link>
  );
}
