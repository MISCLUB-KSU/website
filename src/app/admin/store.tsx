"use client";

import { createContext, useContext, useMemo, useState } from "react";

import type { Note, Row } from "./stats";

/**
 * **مخزنُ الصفوف — ولماذا لا يعيش داخل القائمة.**
 *
 * كان كلُّ فعلٍ ينادي `revalidatePath("/admin")`، والصفحةُ `force-dynamic`:
 * فكلُّ ضغطةٍ تعيد جلب **٨١١ كB لـ٢٥٧ صفًّا** (٣٣٧ منها `answers` و١١٤ `why`
 * — ولا تقرؤهما القائمةُ أصلًا بل ملفٌّ واحدٌ مفتوح) ثم تبني الشجرة من
 * جديد. والموسمُ المتوقَّع يزيد على ٦٠٠ فتصير ‏١٫٩ مB في الضغطة الواحدة.
 *
 * فصارت الصفوفُ والملاحظاتُ حالةً هنا، والفعلُ يُرجع **ما كتبه** فيُرقَّع
 * موضعيًّا بلا جلبٍ ولا رسمٍ للشجرة كلِّها. وقاعدةُ أيِّ فعلٍ يُرقَّع وأيِّ
 * فعلٍ يبقى على `revalidatePath` مكتوبةٌ في رأس `actions.ts`.
 *
 * 🔴 **ويعيش فوق التبويبات لا داخل القائمة — وهذا ليس ذوقًا في التنظيم.**
 * `admin-tabs.tsx` يرسم لوحَ التبويب بـ`{tab === "list" && …}`، أي أن
 * تبديل التبويب **يفكّ** المكوّن ويهدم حالتَه. فلو سكن المخزنُ في القائمة
 * لوقع هذا: يقبل القائدُ عشرةً، ثم ينتقل إلى «اللوحة» فتقرأ صفوفَ الخادم
 * غيرَ المرقَّعة وتقول «حُسم ٠»، ثم يعود إلى القائمة **فترتدّ العشرةُ إلى
 * ما كانت**. واللوحةُ والمساراتُ والقائمةُ ثلاثتُها تشتقّ من `rows` —
 * فمصدرُها واحدٌ فوقها جميعًا أو تفترق.
 *
 * ⚠️ **والخادمُ يبقى سيّدًا:** أيُّ جلبٍ حقيقيّ (تمريرٌ · فتحُ مرحلة ·
 * إعادةُ تحميل) يصل بخصائصَ جديدة فتُطرح الحالةُ المحلّيةُ كلُّها وتحلّ
 * محلَّها. فالترقيعُ جسرٌ بين ضغطةٍ وجلب، لا مصدرُ حقيقةٍ ثانٍ ينحرف.
 *
 * ⚠️ **وثمنُه مقبولٌ ومعلوم:** تغييرُ قائدٍ آخر لا يظهر حتى إعادة التحميل.
 * و`RLS` تفصل نطاقات القادة أصلًا، فالتقاطعُ الوحيد رئاسةٌ مع قائد — وهو
 * نادرٌ ويُحلّ بإعادة تحميلٍ واحدة. وهذا ثمنُ أن تستجيب اللوحةُ لضغطةٍ
 * واحدةٍ بلا ‏١٫٩ مB.
 */
export type Store = {
  /** يضبط حقولًا على صفوفٍ بأعيانها — والمعرَّفاتُ من ردّ الخادم لا من طلبنا */
  patchRows: (ids: readonly string[], fields: Partial<Row>) => void;
  /** يضع ملاحظةً: جديدةً تُضاف، وموجودةً تحلّ محلَّ نفسِها */
  putNote: (note: Note) => void;
  dropNote: (id: string) => void;
};

const StoreCtx = createContext<Store | null>(null);

export function useStore(): Store {
  const store = useContext(StoreCtx);
  /* ⚠️ يرمي ولا يُرجع قيمةً صامتة: مرقِّعٌ بلا مزوّدٍ يعني شاشةً تسكت عن
     تغييرٍ وقع — وهو بالضبط صنفُ العطل الذي سُمّي هذا الفرعُ باسمه. */
  if (!store) throw new Error("StoreCtx: لا مزوّد فوق هذا المكوّن");
  return store;
}

export function useRowStore(
  serverRows: readonly Row[],
  serverNotes: readonly Note[],
) {
  const [rows, setRows] = useState(serverRows);
  const [notes, setNotes] = useState(serverNotes);

  /**
   * **مزامنةٌ أثناء الرسم لا في `useEffect`.**
   *
   * ⚠️ المزامنةُ في `useEffect` ترسم مرّةً بالقديم ثم تصحّح — أي **ومضةٌ
   * يظهر فيها ما بطل**. وبعد تمريرٍ ناجحٍ تعني: يرى القائدُ الصفَّ عند نطاقه
   * لحظةً ثم يختفي. وهذا النمطُ — مقارنةُ الخصائص بما رُئي وضبطُ الحالة في
   * أثناء الرسم — هو ما توصي به React لحالةٍ مشتقّةٍ من خصائص.
   */
  const [seen, setSeen] = useState({ rows: serverRows, notes: serverNotes });
  if (seen.rows !== serverRows || seen.notes !== serverNotes) {
    setSeen({ rows: serverRows, notes: serverNotes });
    setRows(serverRows);
    setNotes(serverNotes);
  }

  const store = useMemo<Store>(
    () => ({
      patchRows: (ids, fields) => {
        const set = new Set(ids);
        if (set.size === 0) return;
        setRows((prev) =>
          prev.map((r) => (set.has(r.id) ? { ...r, ...fields } : r)),
        );
      },
      putNote: (note) =>
        setNotes((prev) => {
          const at = prev.findIndex((n) => n.id === note.id);
          if (at === -1) return [...prev, note];
          const next = [...prev];
          next[at] = note;
          return next;
        }),
      dropNote: (id) => setNotes((prev) => prev.filter((n) => n.id !== id)),
    }),
    [],
  );

  return { rows, notes, store, StoreProvider: StoreCtx.Provider };
}
