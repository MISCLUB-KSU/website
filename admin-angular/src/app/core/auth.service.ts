import { Injectable, computed, inject, signal } from "@angular/core";
import type { Session } from "@supabase/supabase-js";

import { SupabaseClientService } from "./supabase.client";

/** عضوُ فريقٍ كما هو في جدول `staff` */
export type StaffMember = {
  email: string;
  role: string;
  display_name: string | null;
};

/**
 * الجلسةُ والصلاحية.
 *
 * ⚠️ **حالتان لا واحدة: «داخلٌ» و«من فريق العمل».** الأولى تقولها Supabase،
 * والثانية صفٌّ في `staff`. ومن دخل ببريدٍ ليس في الجدول **يدخل بنجاح ولا
 * يرى صفًّا واحدًا** — لأن `RLS` تردّه، لا لأن الواجهة أخفت. فلو لم نفرّق
 * بينهما لرأى جدولًا فارغًا وظنّ الموسم لم يبدأ.
 *
 * ⚠️ **و`loading` حالةٌ ثالثةٌ لازمة.** استعادةُ الجلسة من التخزين غيرُ
 * متزامنة: لحظةَ الإقلاع لا جلسةَ بعد، فحارسٌ يقرأ `session()` مباشرةً
 * يطرد قائدًا **داخلًا فعلًا** إلى شاشة الدخول في كل تحديثِ صفحة. فالحارس
 * ينتظر `ready` أوّلًا.
 */
@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly supabase = inject(SupabaseClientService).client;

  private readonly _session = signal<Session | null>(null);
  private readonly _staff = signal<StaffMember | null>(null);
  private readonly _ready = signal(false);

  readonly session = this._session.asReadonly();
  readonly staff = this._staff.asReadonly();
  readonly ready = this._ready.asReadonly();

  readonly email = computed(() => this._session()?.user?.email ?? null);
  readonly isSignedIn = computed(() => this._session() !== null);
  /** رئاسةٌ ترى كلَّ شيء · قائدٌ يرى نطاقه — والدورُ من القاعدة لا من هنا */
  readonly isAdmin = computed(() => this._staff()?.role === "admin");

  /** وعدٌ واحدٌ ينتظره الحارس مهما تعدّدت المسارات */
  private readonly settled: Promise<void>;

  constructor() {
    this.settled = this.restore();

    /* ⚠️ **يُشترك مرّةً واحدةً في الباني لا في كل مكوّن.** تغيّرُ الجلسة
       (تجديدُ رمزٍ · خروجٌ من تبويبٍ آخر) يجب أن يصل التطبيقَ كلَّه، ومكوّنٌ
       يشترك ثم يُدمَّر بلا إلغاءٍ يترك مستمعًا معلَّقًا يكتب في حالةٍ ميتة. */
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this._session.set(session);
      if (session) {
        void this.loadStaff(session.user.email ?? "");
      } else {
        this._staff.set(null);
      }
    });
  }

  /** ينتظره الحارس: لا قرارَ قبل أن تُعرف الجلسة */
  whenReady(): Promise<void> {
    return this.settled;
  }

  private async restore(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    this._session.set(data.session ?? null);
    if (data.session) {
      await this.loadStaff(data.session.user.email ?? "");
    }
    this._ready.set(true);
  }

  /**
   * ⚠️ **البريدُ يُصغَّر قبل البحث.** المُحفِّز `staff_normalize_email_trg`
   * يُصغّر ما يُكتب في الجدول، فبحثٌ بـ`Saud@Outlook.com` لا يجد صفَّ
   * `saud@outlook.com` — ويُقرأ «لا صلاحية» لعضوٍ صلاحيتُه قائمة.
   */
  private async loadStaff(email: string): Promise<void> {
    if (!email) {
      this._staff.set(null);
      return;
    }
    const { data, error } = await this.supabase
      .from("staff")
      .select("email, role, display_name")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    /* ⚠️ **الخطأ يُسجَّل ولا يُهمَل.** سياسةٌ ترفض أو رمزٌ انتهى يخرج بنفس
       شاشة «لا صلاحية» — وهو الخطأ الذي وقع في لوحة Next (١٥ أغسطس). */
    if (error) {
      console.error("[auth] تعذّرت قراءة صفّ الفريق", {
        code: error.code,
        message: error.message,
      });
    }
    this._staff.set((data as StaffMember | null) ?? null);
  }

  /**
   * رابطُ دخولٍ إلى البريد — الطريقةُ نفسُها في لوحة Next (`signInWithOtp`).
   * ولا كلمةَ مرور: كلمةٌ تُنسى وتُشارَك، والرابطُ ينتهي وحده.
   */
  async sendLoginLink(email: string): Promise<{ error: string | null }> {
    const { error } = await this.supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        /* ⛔ لا يُنشأ مستخدمٌ جديد من هنا: الدخولُ لفريق العمل وحده، ومن
           ليس في `staff` لا يُصنع له حساب. */
        shouldCreateUser: false,
      },
    });
    return { error: error?.message ?? null };
  }

  /** البديلُ حين لا يُفتح الرابط: رمزٌ من ستّ خانات في البريد نفسِه */
  async verifyCode(
    email: string,
    token: string,
  ): Promise<{ error: string | null }> {
    const { error } = await this.supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: token.trim(),
      type: "email",
    });
    return { error: error?.message ?? null };
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut();
  }
}
