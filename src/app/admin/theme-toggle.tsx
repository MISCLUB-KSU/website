"use client";

import { useEffect, useState } from "react";

/**
 * مبدّل وضع اللوحة — **زرٌّ واحدٌ بشكلٍ لا باسم**.
 *
 * كان مجموعةً من خيارين مكتوبين («فاتح | داكن») فطلب حسام ضغطةً واحدة
 * وشكلًا. والشكلُ هنا **ما ستنتقل إليه** لا ما أنت فيه — فالزرُّ فعلٌ لا
 * لافتة. والالتباس المعروف في هذا النمط يُحسم بالاسم المتاح لقارئ الشاشة
 * (`aria-label`) وبـ`title` للفأرة، فلا يبقى الشكلُ وحده يحمل المعنى.
 *
 * ⚠️ مفتاحُ التخزين خاصٌّ باللوحة (`mis-admin-theme`) لا مشتركٌ مع الموقع
 * العامّ: تبديلُك هنا لا يقلب الموقع الذي يُقرأ في المتصفّح نفسه.
 */

export const ADMIN_THEME_KEY = "mis-admin-theme";

type Mode = "dark" | "light";

export function ThemeToggle() {
  /* ⚠️ لا يُقرأ التخزين في مُهيّئ `useState`: المكوّن يُرسم على الخادم ولا
     `localStorage` هناك. والنصُّ في `layout` تكفّل بالوضع قبل أول رسم. */
  const [mode, setMode] = useState<Mode>("dark");

  useEffect(() => {
    setMode(localStorage.getItem(ADMIN_THEME_KEY) === "light" ? "light" : "dark");
  }, []);

  const next: Mode = mode === "dark" ? "light" : "dark";
  const label = next === "light" ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع الداكن";

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => {
        setMode(next);
        localStorage.setItem(ADMIN_THEME_KEY, next);
        document.documentElement.dataset.theme = next;
      }}
      className="border-line bg-bg-sunken hover:bg-line-quiet flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors"
    >
      {next === "light" ? <Sun /> : <Moon />}
    </button>
  );
}

/* الشكلان مرسومان هنا لا مستورَدان: حزمةُ أيقوناتٍ كاملة لأجل شكلين
   وزنٌ بلا مقابل، وخطُّها الموحَّد أثرٌ معروف. والقياس `18` ليطابق وزن
   النصّ حوله. */
function Sun() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4.4" stroke="currentColor" strokeWidth="1.8" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line
          key={a}
          x1="12"
          y1="2.4"
          x2="12"
          y2="5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          transform={`rotate(${a} 12 12)`}
        />
      ))}
    </svg>
  );
}

function Moon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20.5 14.6A8.7 8.7 0 0 1 9.4 3.5a8.7 8.7 0 1 0 11.1 11.1Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
