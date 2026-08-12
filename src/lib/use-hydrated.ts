"use client";

import { useSyncExternalStore } from "react";

/**
 * هل رُكِّب المكوّن في المتصفّح؟ — `false` في رسم الخادم وأوّل رسمٍ بعده.
 *
 * تُستعمل لبوّابةٍ واحدة: **ما لا يجوز أن يظهر إلّا والجافاسكربت يعمل**
 * (حركةٌ تبدأ، حقلٌ محسَّن، لوحُ إدارةٍ تفاعليّ). ورسمُ الخادم لا بدّ أن
 * يطابق أوّل رسمٍ في المتصفّح وإلّا صرخت React على اختلاف الترطيب — فالقيمة
 * الابتدائية `false` في الجهتين ثم تنقلب.
 *
 * ⚠️ **`useSyncExternalStore` لا `useState` + `useEffect`.** النمط القديم
 * (`useState(false)` ثم `useEffect(() => setLive(true), [])`) كان مكرّرًا
 * في خمسة مواضع، وهو **ضبطُ حالةٍ داخل أثرٍ** — تمنعه قواعد React الحديثة
 * (`react-hooks/set-state-in-effect`) لأنه يسلسل رسمًا بعد رسم. وهذي هي
 * الواجهة الموضوعة لقراءة حالةٍ خارج React بأمانٍ مع الترطيب.
 *
 * `subscribe` في نطاق الوحدة لا داخل الخطّاف: مرجعٌ ثابت، وإلّا أعادت
 * React الاشتراكَ في كل رسم. ولا شيء يُشترَك فيه أصلًا — القيمة تنقلب
 * مرّةً واحدة عند الترطيب ولا تتغيّر بعدها.
 */
const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, onClient, onServer);
}
