"use client";

import { createContext, useContext } from "react";

import type { LeadershipPerson } from "@/content/leadership";

/**
 * الشخصُ ومكانُه في الشجرة.
 *
 * `path` مسارُه من الجذر — «الفصل ← اللجنة ← الوحدة». وهو ما يجعل فتحَ
 * البطاقة يستحقّ نقرة حتى لمن لا رابطَ له: البطاقةُ تجيب «أين يقع هذا
 * الشخص من الهيكل» لا «ما اسمه» — فالاسم مقروءٌ في الصفحة أصلًا.
 */
export type PersonView = {
  person: LeadershipPerson;
  path: readonly string[];
};

type OpenPerson = (view: PersonView, trigger: HTMLElement) => void;

/**
 * السياقُ يمرّر فاتحَ البطاقة إلى العقد مهما عمُقت، بدل تمريره خاصّيةً عبر
 * ثلاث طبقات. وملفٌّ مستقلٌّ عن `descent.tsx` عمدًا: لو عُرّف هناك لصار
 * الاستيراد دائريًّا (descent ← الطبقات ← البطاقة ← descent).
 */
const OpenPersonContext = createContext<OpenPerson>(() => {});

export const OpenPersonProvider = OpenPersonContext.Provider;

export function useOpenPerson(): OpenPerson {
  return useContext(OpenPersonContext);
}
