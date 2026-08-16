import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";

import { AuthService } from "../../core/auth.service";

/**
 * تسجيلُ الدخول — رابطٌ إلى البريد، ورمزٌ بديلٌ إن لم يُفتح الرابط.
 *
 * ⚠️ **لا كلمةَ مرور.** كلمةٌ تُنسى وتُشارَك بين قادةٍ يتبدّلون كلَّ موسم،
 * والرابطُ ينتهي وحده. وهي الطريقةُ نفسُها في لوحة Next
 * (`signInWithOtp`) — فلا يتعلّم القائد بابين.
 *
 * ⚠️ **والرمزُ ليس زينة.** بريدُ الجامعة يفتح الروابط أحيانًا في متصفّحٍ
 * داخليّ لا تصل إليه الجلسة، فيضغط القائد الرابطَ ولا يدخل. والرمزُ
 * يُكتب في المتصفّح نفسِه الذي يريد الدخول منه.
 */
@Component({
  selector: "app-login",
  imports: [FormsModule],
  templateUrl: "./login.page.html",
  styleUrl: "./login.page.css",
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly email = signal("");
  readonly code = signal("");
  readonly busy = signal(false);
  /** `form` طلبُ الرابط · `code` بعد إرساله: انتظارٌ أو إدخالُ رمز */
  readonly stage = signal<"form" | "code">("form");
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  async send(): Promise<void> {
    const email = this.email().trim();
    if (!email) {
      this.error.set("اكتب بريدك أوّلًا.");
      return;
    }
    this.busy.set(true);
    this.error.set(null);

    const { error } = await this.auth.sendLoginLink(email);
    this.busy.set(false);

    if (error) {
      /* ⚠️ **لا يُقال «هذا البريد ليس مسجّلًا».** ذاك يكشف من في الفريق
         لمن يجرّب العناوين. والرسالةُ واحدةٌ للحالتين، والرئاسةُ تعرف من
         أضافت. */
      this.error.set("تعذّر إرسال الرابط. تأكّد من بريدك أو راجع الرئاسة.");
      return;
    }

    this.stage.set("code");
    this.notice.set(
      "أُرسل رابطُ الدخول إلى بريدك. افتحه من هذا الجهاز، أو اكتب الرمز أدناه.",
    );
  }

  async verify(): Promise<void> {
    const code = this.code().trim();
    if (code.length < 6) {
      this.error.set("الرمز ستّ خانات.");
      return;
    }
    this.busy.set(true);
    this.error.set(null);

    const { error } = await this.auth.verifyCode(this.email(), code);
    this.busy.set(false);

    if (error) {
      this.error.set("الرمز غير صحيح أو انتهت صلاحيته. اطلب رابطًا جديدًا.");
      return;
    }

    /* الوجهةُ المحفوظة إن جاء من مسارٍ محميّ، وإلا الجذر */
    const to = this.route.snapshot.queryParamMap.get("to") ?? "/";
    void this.router.navigateByUrl(to);
  }

  back(): void {
    this.stage.set("form");
    this.code.set("");
    this.error.set(null);
    this.notice.set(null);
  }
}
