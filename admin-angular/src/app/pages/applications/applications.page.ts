import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";

import {
  DIRECT_STATUSES,
  STATUSES,
  statusLabel,
  type Application,
} from "../../core/application.model";
/* ⚠️ **مصدرٌ واحدٌ للرغبات مع موقع النادي — لا نسخةٌ ثانية هنا.**
   الملفُّ بياناتٌ صرفة بلا استيرادٍ يخصّ Next، فيُقرأ من الاثنين. ونسخُه
   كان يعني قائمتين تفترقان بعد أوّل تعديلٍ يُنسى في إحداهما — وهو بالضبط
   ما حذّرتُ منه حين سُئلتُ عن تضارب التقنيات. */
import { findPreference } from "../../../../../src/content/preferences";

import { ApplicationsService } from "../../core/applications.service";
import { AuthService } from "../../core/auth.service";

/**
 * جدولُ الطلبات — الشاشةُ التي يقضي فيها القائد موسمه.
 *
 * ⚠️ **البحثُ والتصفية في المتصفّح لا في القاعدة.** الصفوفُ تصل مقصوصةً
 * بـ`RLS` فعددُها بالمئات لا بالملايين، وترشيحُها هنا فوريٌّ بلا ذهابٍ
 * إلى الشبكة عند كل حرف. ولو تجاوزت الآلافَ يومًا تُنقل التصفيةُ إلى
 * الاستعلام — والحدُّ يُقاس لا يُقدَّر.
 *
 * ⚠️ **ولا يُعرض رقمُ الأحوال في الجدول.** يظهر في ملفّ المتقدّم وحده حين
 * يفتحه القائد قاصدًا: شاشةٌ فيها ستّون رقمَ هويّةٍ تُصوَّر بلمسةٍ واحدة.
 */
@Component({
  selector: "app-applications",
  imports: [FormsModule],
  templateUrl: "./applications.page.html",
  styleUrl: "./applications.page.css",
})
export class ApplicationsPage {
  private readonly service = inject(ApplicationsService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly rows = this.service.rows;
  readonly loading = this.service.loading;
  readonly loadError = this.service.error;

  readonly email = this.auth.email;
  readonly staff = this.auth.staff;

  /**
   * ⛔ **الثلاثةُ المباشرة وحدها — لا «معتذَر عنه» ولا «محال للثانية».**
   *
   * «معتذَر عنه» صارت تعني «انتهت رغباتُه كلُّها»، وهو حكمٌ تملكه القاعدةُ
   * وحدها عبر `pass_over`؛ وضبطُها من قائمةٍ منسدلة يقفز فوق السلّم فيُخرج
   * من له رغبتان باقيتان. و«محال للثانية» زالت — النزولُ صار `stage + 1`.
   *
   * وهذي اللوحةُ مختبرُ تعلّمٍ لا لوحةَ النادي (اللوحةُ في `/admin`)، لكنها
   * تشير إلى قاعدة الإنتاج — فالقصُّ هنا حراسةٌ لا تنظيمُ عرض.
   */
  readonly statuses = STATUSES.filter((s) => DIRECT_STATUSES.includes(s.value));
  readonly label = statusLabel;

  readonly query = signal("");
  readonly filter = signal<string>("all");
  /** الطلبُ المفتوح في اللوح الجانبيّ — و`null` يعني لا لوح */
  readonly open = signal<Application | null>(null);
  readonly saving = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);

  constructor() {
    void this.service.load();
  }

  /** عدّادُ كل حالةٍ — يُحسب من الصفوف الواصلة، فيخصّ نطاق قارئه */
  readonly tallies = computed(() => {
    const rows = this.rows();
    const map = new Map<string, number>();
    for (const row of rows) map.set(row.status, (map.get(row.status) ?? 0) + 1);
    return map;
  });

  readonly shown = computed(() => {
    const q = this.query().trim().toLowerCase();
    const status = this.filter();
    return this.rows().filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (!q) return true;
      /* ⛔ **رقمُ الأحوال ليس حقلَ بحث.** البحثُ به يجعل الشاشةَ أداةَ
         تحقّقٍ من هويّةٍ بمعرفة رقمها، وهو ما لا تحتاجه المراجعة. */
      return (
        row.full_name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        row.student_id.toLowerCase().includes(q)
      );
    });
  });

  /**
   * اسمُ الجهة كما يقرؤه القائد — لا `project:misthon` الخام.
   *
   * وعند القيمة المجهولة تُعاد كما هي: جهةٌ حُذفت من `projects.ts` بعد أن
   * قُدّم عليها تبقى مقروءةً بقيمتها، ولا يُخفى الصفُّ ولا يُفرَّغ عمودُه.
   */
  choiceLabel(value: string): string {
    return findPreference(value)?.fullLabel ?? value;
  }

  /** تاريخٌ عربيٌّ مقروء — لا `toLocaleString` خام يخرج بصيغةٍ مختلطة */
  when(iso: string): string {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
      numberingSystem: "latn",
    }).format(d);
  }

  async change(row: Application, status: string): Promise<void> {
    if (status === row.status) return;
    this.saving.set(row.id);
    this.saveError.set(null);

    const { error } = await this.service.setStatus(row.id, status);
    this.saving.set(null);

    if (error) {
      this.saveError.set(error);
      return;
    }
    /* اللوحُ المفتوح يتبع الصفَّ المحدَّث لا نسختَه القديمة */
    const fresh = this.rows().find((r) => r.id === row.id) ?? null;
    if (this.open()?.id === row.id) this.open.set(fresh);
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    void this.router.navigate(["/login"]);
  }

  refresh(): void {
    void this.service.load();
  }
}
