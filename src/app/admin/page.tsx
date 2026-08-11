import { Mark } from "@/components/site/mark";
import { AdminTabs } from "./admin-tabs";
import { ThemeToggle } from "./theme-toggle";
import { findPreference } from "@/content/preferences";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";
import type { Row } from "./stats";

/**
 * لوحة الطلبات.
 *
 * ⚠️ **لا فلترةَ نطاقٍ في هذا الملفّ إطلاقًا، وهذا مقصود.** الاستعلام
 * `select("*")` بلا شرط، والذي يقصّه هو `RLS` في القاعدة: قائد اللجنة
 * يستقبل صفوف نطاقه وحده، ومن ليس في `staff` يستقبل صفرًا. لو فُلتِر هنا
 * لصار الأمان في الواجهة — وواجهةٌ يمكن تجاوزها باستدعاءٍ مباشر.
 *
 * ولأن الصفوف تصل مقصوصةً، **كل رقمٍ يخصّ نطاق قارئه**: قائدٌ يرى طلب
 * نطاقه، والرئاسة الصورةَ كاملة. فحصُ العزل في هجرة `rls_scope_isolation`.
 */

export const metadata = { title: "طلبات العضوية", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("staff")
    .select("role, scopes, label")
    .eq("email", (user?.email ?? "").toLowerCase())
    .maybeSingle();

  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (!me) {
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-20">
        <div className="tile p-s7">
          <h1 className="mb-3 text-2xl font-bold">لا صلاحية لك</h1>
          <p className="leading-relaxed opacity-75">
            بريدك{" "}
            <span dir="ltr" className="font-medium">
              {user?.email}
            </span>{" "}
            ليس في طاقم الاطّلاع. راجع رئاسة النادي إن كان ينبغي أن يكون.
          </p>
          <form action={signOut} className="mt-s5">
            <button type="submit" className="text-sm font-semibold text-accent">
              خروج
            </button>
          </form>
        </div>
      </main>
    );
  }

  const rows = (data ?? []) as Row[];
  const scopeNames = ((me.scopes ?? []) as string[]).map(
    (scope) => findPreference(scope)?.fullLabel ?? scope,
  );
  const lastAt = rows[0] ? relative(rows[0].created_at) : null;

  return (
    /* ⚠️ **بلا رقمٍ سحريّ.** أول محاولةٍ طرحت ارتفاع الترويسة وحده
        (`100svh - 4.25rem`) فبقيت ٧٤px تفيض: شريطُ التبويبات والهوامش لم
        تُحسب. والعلاج بنيويّ لا حسابيّ — عمودٌ بارتفاع الشاشة، والترويسة
        والتبويبات `shrink-0`، واللوحة تأخذ ما بقي بـ`flex-1 min-h-0`.
        فأيُّ تغييرٍ في الترويسة لاحقًا لا يكسر شيئًا. */
    <main className="dash mx-auto flex w-full max-w-[110rem] flex-col px-s4 pb-s4 lg:h-[100svh]">
      {/* ⚠️ الترويسة **خفيفةٌ عمدًا**: كل بكسلٍ فيها يُخصم من الشاشة التي
          يجب أن تسع اللوحة كاملةً بلا تمرير. ولذلك لا لوحَ لها ولا حشوٌ
          رأسيّ كبير — وارتفاعها `--dash-head` نفسه المخصوم من `100svh`. */}
      {/* ⚠️ **صفٌّ واحدٌ على الجوّال أيضًا.** كانت تلتفّ إلى صفّين (113px)
          لأن مجموع الكتلتين يتجاوز العرضَ بـ13px فقط — فالفجوةُ تضيق على
          الجوّال وتتّسع على الحاسب، وكتلةُ النطاق تنكمش وتُقصّ عند الحاجة. */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-s3 gap-y-s2 py-s3 lg:gap-x-s5">
        <div className="flex min-w-0 flex-1 items-center gap-x-s3 lg:flex-none lg:gap-x-s4">
          <Mark className="h-6 w-auto text-deep" />
          <div className="min-w-0 border-s border-line ps-s3 lg:ps-s4">
            <p className="truncate text-[0.68rem] opacity-60">
              {me.role === "admin"
                ? "كل اللجان والمشاريع"
                : scopeNames.join(" · ") || "بلا نطاق"}
            </p>
            <p className="text-[0.86rem] font-bold">
              {rows.length} طلبًا
              {lastAt && (
                /* ⚠️ يُطوى دون `sm`: التفافُه إلى سطرٍ ثالث هو ما جعل
                   الترويسة تتضخّم على شاشةٍ 374px. والعددُ يبقى. */
                <span className="ms-s2 hidden text-[0.72rem] font-normal opacity-60 sm:inline">
                  · آخرُ طلبٍ {lastAt}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-x-s4">
          <ThemeToggle />
          <span className="hidden text-[0.76rem] opacity-60 sm:inline" dir="ltr">
            {user?.email}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="min-h-11 lg:min-h-9 rounded-full bg-bg-sunken px-s4 text-[0.78rem] font-semibold transition-colors hover:bg-line-quiet"
            >
              خروج
            </button>
          </form>
        </div>
      </header>

      {error && (
        <p role="alert" className="tile mb-s4 px-s5 py-s4 font-medium text-danger">
          تعذّر جلب الطلبات.
        </p>
      )}

      <AdminTabs rows={rows} />
    </main>
  );
}

/**
 * «قبل ساعتين» بدل تاريخٍ مجرّد.
 *
 * الرئيس يسأل «هل يصل شيءٌ الآن؟» لا «ما تاريخ آخر صفّ». والحسابُ على
 * الخادم متعمَّد: `dynamic = "force-dynamic"` يعيد الرسم كل طلب، فلا
 * يتجمّد النصّ في `cache`.
 */
function relative(iso: string): string {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (!Number.isFinite(mins)) return "";
  if (mins < 2) return "الآن";
  if (mins < 60) return `قبل ${mins} دقيقة`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? "قبل ساعة" : `قبل ${hours} ساعة`;
  const dayCount = Math.round(hours / 24);
  return dayCount === 1 ? "قبل يوم" : `قبل ${dayCount} يومًا`;
}
