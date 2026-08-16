import type { Routes } from "@angular/router";

import { authGuard } from "./core/auth.guard";

/**
 * ⚠️ **الصفحاتُ تُحمَّل كسولًا (`loadComponent`).** شاشةُ الدخول أوّلُ ما
 * يُفتح، ولا داعيَ أن يُحمَّل معها جدولُ الطلبات بكامله لمن لم يدخل بعد.
 */
export const routes: Routes = [
  {
    path: "login",
    title: "تسجيل الدخول — لوحة التحكّم",
    loadComponent: () =>
      import("./pages/login/login.page").then((m) => m.LoginPage),
  },
  {
    path: "",
    title: "طلبات العضوية",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./pages/applications/applications.page").then(
        (m) => m.ApplicationsPage,
      ),
  },
  /* عنوانٌ خاطئ يعود إلى الجذر — والحارسُ يقرّر بعدها: جدولٌ أو دخول.
     لا صفحةَ 404 في لوحةٍ مسارُها اثنان. */
  { path: "**", redirectTo: "" },
];
