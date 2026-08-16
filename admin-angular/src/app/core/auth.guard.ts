import { inject } from "@angular/core";
import { Router, type CanActivateFn } from "@angular/router";

import { AuthService } from "./auth.service";

/**
 * حارسُ المسارات المحميّة.
 *
 * ⚠️ **ينتظر `whenReady` قبل أن يقرّر.** استعادةُ الجلسة من التخزين غيرُ
 * متزامنة، فحارسٌ يقرأ الحالة لحظةَ الإقلاع يجدها فارغةً دائمًا — ويطرد
 * **كلَّ** قائدٍ إلى شاشة الدخول في كل تحديثِ صفحة، وهي جلسةٌ قائمة.
 *
 * ⚠️ **وهو راحةٌ لا حاجز.** المنعُ الحقيقيّ في `RLS`: من فتح المسار بحيلةٍ
 * يرى الشاشةَ ولا يرى صفًّا. فلا يُضاف هنا منطقُ صلاحياتٍ يُظنّ أنه يحمي.
 */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.whenReady();
  if (auth.isSignedIn()) return true;

  /* الوجهةُ تُحفظ فيعود إليها بعد الدخول لا إلى الجذر */
  return router.createUrlTree(["/login"], {
    queryParams: { to: state.url },
  });
};
