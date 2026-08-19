"use client";

import { useEffect, useState } from "react";

import { ApplicationsTable } from "./applications-table";
import { Dashboard } from "./dashboard";
import { FlowChart } from "./flow";
import type { Note, Row } from "./stats";
import { useRowStore } from "./store";

/**
 * تبويبات اللوحة.
 *
 * ⚠️ **التبويب ليس زينة، بل هو ما يجعل «بلا تمرير» ممكنًا.** لوحةٌ واحدة
 * تجمع الرسوم وجدولَ ثلاثين صفًّا لا تدخل شاشةً أبدًا. ففُصلت: شاشةُ
 * الأرقام بلا تمرير، وجدولُ العمل بتمريره الخاص. وهذا ما يفعله المرجع.
 *
 * والحالة في العنوان (`hash`) لا في `state` وحده: تحديثُ الصفحة أو مشاركةُ
 * الرابط يبقيان على التبويب نفسه.
 */

const TABS = [
  { key: "dash", label: "اللوحة" },
  { key: "flow", label: "المسارات" },
  { key: "list", label: "الطلبات" },
] as const;

type Key = (typeof TABS)[number]["key"];

export function AdminTabs({
  rows: serverRows,
  notes: serverNotes,
  phase,
  scopes,
  isAdmin,
  me,
}: {
  rows: readonly Row[];
  notes: readonly Note[];
  /** أعلى رتبةٍ فُتح العملُ عليها — من `settings` */
  phase: number;
  scopes: readonly string[];
  isAdmin: boolean;
  /** بريدُ القارئ — به يُعرف ما يملك تعديلَه من الملاحظات */
  me: string;
}) {
  /**
   * ⚠️ **المخزنُ هنا لا في `ApplicationsTable` — واللوحُ يُفكّ عند التبديل.**
   *
   * لوحُ التبويب يُرسم بـ`{tab === "…" && …}`، فالانتقالُ يهدم حالةَ اللوح
   * السابق. فلو سكن المخزنُ في القائمة لَقَبِل القائدُ عشرةً ثم انتقل إلى
   * «اللوحة» فقرأت صفوفَ الخادم غيرَ المرقَّعة وقالت «حُسم ٠»، ثم عاد
   * فارتدّت العشرة. والثلاثةُ تشتقّ من `rows` — فمصدرُها واحدٌ فوقها.
   */
  const { rows, notes, store, StoreProvider } = useRowStore(
    serverRows,
    serverNotes,
  );
  const [tab, setTab] = useState<Key>("dash");

  /* ⚠️ **قراءة `hash` في `useEffect` لا في مُهيّئ `useState`.**
     المكوّن يُرسَم على الخادم أولًا ولا `window` هناك، فكان المُهيّئ يُرجع
     «اللوحة» دائمًا ويُهمَل العنوان — قِسناه بفتح `#list` فظهرت اللوحة.
     والمزامنة بعد التركيب تصيب، وتتجنّب اختلاف رسم الخادم عن العميل. */
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1);
      if (TABS.some((t) => t.key === h)) setTab(h as Key);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const go = (k: Key) => {
    setTab(k);
    history.replaceState(null, "", `#${k}`);
  };

  return (
    <StoreProvider value={store}>
    <div className="flex min-h-0 flex-1 flex-col">
      <div role="tablist" aria-label="أقسام اللوحة" className="seg shrink-0 self-start">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            className="seg-item"
            onClick={() => go(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ⚠️ التمرير **داخل اللوح** لا في الصفحة: اللوحة تُملأ بلا تمرير،
          والجدول والمسارات يُمرَّران في مكانهما فتبقى الترويسة والتبويبات
          ثابتتين. */}
      <div
        role="tabpanel"
        className={`mt-s3 min-h-0 flex-1 ${tab === "flow" ? "overflow-y-auto" : ""}`}
      >
        {tab === "dash" && (
          <Dashboard
            rows={rows}
            scopes={scopes}
            isAdmin={isAdmin}
            phase={phase}
          />
        )}
        {tab === "flow" && (
          <div className="tile p-s5 sm:p-s6">
            <FlowChart rows={rows} scopes={scopes} isAdmin={isAdmin} />
          </div>
        )}
        {tab === "list" && (
          <ApplicationsTable
            rows={rows}
            notes={notes}
            phase={phase}
            scopes={scopes}
            isAdmin={isAdmin}
            me={me}
          />
        )}
      </div>
    </div>
    </StoreProvider>
  );
}
