import { Injectable, computed, inject, signal } from "@angular/core";

import type { Application } from "./application.model";
import { SupabaseClientService } from "./supabase.client";

/**
 * قراءةُ الطلبات وتعديلُ حالتها.
 *
 * ⚠️ **لا فلترةَ نطاقٍ في هذا الملفّ إطلاقًا — وهذا مقصود.** الاستعلام
 * `select("*")` بلا شرط، والذي يقصّه `RLS`: قائدُ اللجنة يستقبل صفوفَ
 * نطاقه وحده، ومن ليس في `staff` يستقبل صفرًا. ولو فُلتِر هنا لصار الأمانُ
 * في الواجهة — وواجهةٌ يمكن تجاوزها باستدعاءٍ مباشر. هي القاعدةُ نفسُها
 * المكتوبة في `src/app/admin/page.tsx` بمشروع Next، وتُنقل معها كما هي.
 *
 * ولأن الصفوف تصل مقصوصةً، **كلُّ رقمٍ يخصّ نطاق قارئه**.
 */
@Injectable({ providedIn: "root" })
export class ApplicationsService {
  private readonly supabase = inject(SupabaseClientService).client;

  private readonly _rows = signal<readonly Application[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly rows = this._rows.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly count = computed(() => this._rows().length);

  async load(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    const { data, error } = await this.supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      /* ⚠️ **لا يُطبع كائنُ الخطأ كاملًا.** `details` في أخطاء PostgREST
         قد يحمل صفَّ الطلب بما فيه رقمُ الأحوال — وهي الغلطةُ نفسُها التي
         خرجت من QA التسجيل (`join/actions.ts`)، فلا تُعاد هنا. */
      console.error("[applications] تعذّرت القراءة", {
        code: error.code,
        message: error.message,
        hint: error.hint,
      });
      this._error.set("تعذّر جلب الطلبات. حدِّث الصفحة، وإن تكرّر فراجع الرئاسة.");
      this._rows.set([]);
      this._loading.set(false);
      return;
    }

    this._rows.set((data ?? []) as Application[]);
    this._loading.set(false);
  }

  /**
   * تغييرُ الحالة.
   *
   * ⚠️ **يُحدَّث الصفُّ محليًّا من ردّ القاعدة لا من القيمة المُرسَلة.**
   * `select()` بعد `update()` تُرجع الصفَّ كما استقرّ فعلًا؛ ولو كُتبت
   * القيمةُ المرسَلة تفاؤلًا لَأظهرت الواجهةُ نجاحًا على تحديثٍ ردّته
   * سياسةٌ — ويظنّ القائد أنه غيّر حالةَ طلبٍ لم يتغيّر.
   */
  async setStatus(
    id: string,
    status: string,
  ): Promise<{ error: string | null }> {
    const { data, error } = await this.supabase
      .from("applications")
      .update({ status })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[applications] تعذّر تغيير الحالة", {
        code: error.code,
        message: error.message,
      });
      return { error: "لم تُحفظ الحالة. أعد المحاولة." };
    }

    /* صفرُ صفوفٍ يعني أن السياسة ردّت التحديث — لا خطأ، ولا تغيير */
    if (!data) {
      return { error: "لا صلاحية لتغيير حالة هذا الطلب." };
    }

    const updated = data as Application;
    this._rows.update((rows) =>
      rows.map((row) => (row.id === updated.id ? updated : row)),
    );
    return { error: null };
  }
}
