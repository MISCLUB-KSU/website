import { Mark } from "@/components/site/mark";
import { findPreference } from "@/content/preferences";
import { isolateLatin } from "@/lib/bidi";
import { createClient } from "@/lib/supabase/server";
import {
  ArrivalsChart,
  DemandChart,
  Distribution,
  Ring,
  StatusList,
} from "./charts";
import { signOut } from "./login/actions";
import {
  LEVEL_ORDER,
  STATUSES,
  countBy,
  demand,
  perDay,
  type Row,
} from "./stats";

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
 *
 * ⚠️⚠️ والشكل الزجاجيّ قرارٌ صريح من حسام يخالف دليل الهوية — السبب
 * والحدود في رأس `admin.css`.
 */

export const metadata = { title: "طلبات العضوية", robots: { index: false } };
export const dynamic = "force-dynamic";

function StatusName({ value }: { value: string }) {
  return <>{STATUSES.find((s) => s.key === value)?.label ?? value}</>;
}

/**
 * ⚠️ **القيمة غير المعروفة لا تُعرض خامًا.** الطلبات تبقى بين الفصول
 * والمحتوى يتغيّر، فيبقى في طلبٍ قديمٍ قيمةٌ لا تُقابلها رغبةٌ اليوم.
 * وعرضُها كما هي يقلبها الاتجاه العربي (`committee:media` تُقرأ
 * `media:committee`) فتبدو اللوحة معطوبة لا البيانات قديمة.
 */
function PreferenceName({ value }: { value: string }) {
  const found = findPreference(value);
  if (found) return <>{isolateLatin(found.fullLabel)}</>;
  return (
    <span className="text-warning">
      <span dir="ltr">{value}</span> (قيمة لا تُعرف)
    </span>
  );
}

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
        <div className="panel p-s7">
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
  const total = rows.length;
  const statusCounts = Object.fromEntries(countBy(rows, (r) => r.status));
  const demandRows = demand(rows);
  const days = perDay(rows);
  const withCv = rows.filter((r) => r.cv_path).length;
  const decided =
    (statusCounts.accepted ?? 0) + (statusCounts.rejected ?? 0);

  const universities = [...countBy(rows, (r) => r.university)]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const levelCounts = countBy(rows, (r) => r.level);
  const levels = LEVEL_ORDER.filter((l) => levelCounts.has(l)).map((label) => ({
    label,
    value: levelCounts.get(label) ?? 0,
  }));

  const scopeNames = ((me.scopes ?? []) as string[]).map(
    (scope) => findPreference(scope)?.fullLabel ?? scope,
  );

  return (
    <main className="mx-auto w-full max-w-[76rem] px-4 py-6 sm:px-s6 sm:py-s7">
      {/* ── الترويسة ─────────────────────────────────────────────────── */}
      <header className="panel mb-s5 flex flex-wrap items-center justify-between gap-x-s5 gap-y-s4 px-s5 py-s4">
        <div className="flex items-center gap-x-s4">
          <Mark className="h-7 w-auto text-deep" />
          <div className="border-s border-line ps-s4">
            <p className="text-[0.72rem] opacity-60">لوحة الطلبات</p>
            <p className="text-[0.95rem] font-bold">
              {me.role === "admin"
                ? "كل اللجان والمشاريع"
                : scopeNames.join(" · ") || "بلا نطاق"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-x-s4">
          <span className="text-[0.8rem] opacity-70" dir="ltr">
            {user?.email}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="bg-bg-sunken px-s4 py-s2 text-[0.82rem] font-semibold transition-colors hover:bg-line-quiet"
            >
              خروج
            </button>
          </form>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="panel mb-s5 px-s5 py-s4 font-medium text-danger"
        >
          تعذّر جلب الطلبات.
        </p>
      )}

      {total === 0 ? (
        <p className="panel px-s6 py-s8 text-center opacity-70">
          ما وصل طلبٌ بعد.
        </p>
      ) : (
        <>
          {/* ── صفّ الأرقام ───────────────────────────────────────────── */}
          <div className="mb-s5 grid gap-s4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="panel-ink flex flex-col justify-between p-s5">
              <p className="text-[0.8rem] opacity-75">الطلبات</p>
              <p className="mt-s3 flex items-baseline gap-x-s2 text-4xl leading-none font-bold">
                <span dir="ltr" className="tabular-nums">
                  {total}
                </span>
                <span className="text-base font-semibold opacity-75">
                  {total === 1 ? "طلب" : "طلبًا"}
                </span>
              </p>
            </div>

            <div className="panel p-s5">
              <Ring
                value={decided}
                total={total}
                label="حُسم"
                size={92}
              />
            </div>

            <div className="panel p-s5">
              <Ring
                value={withCv}
                total={total}
                label="بسيرة ذاتية"
                size={92}
              />
            </div>

            <div className="panel flex flex-col justify-between p-s5">
              <p className="text-[0.8rem] opacity-70">جهاتٌ وجامعات</p>
              <div className="mt-s3 flex items-baseline gap-x-s5">
                <span>
                  <span
                    dir="ltr"
                    className="text-3xl leading-none font-bold tabular-nums"
                  >
                    {demandRows.length}
                  </span>
                  <span className="ms-s2 text-[0.78rem] opacity-70">جهة</span>
                </span>
                <span>
                  <span
                    dir="ltr"
                    className="text-3xl leading-none font-bold tabular-nums"
                  >
                    {universities.length}
                  </span>
                  <span className="ms-s2 text-[0.78rem] opacity-70">جامعة</span>
                </span>
              </div>
            </div>
          </div>

          {/* ── المنحنى + الحالة ─────────────────────────────────────── */}
          <div className="mb-s5 grid gap-s4 lg:grid-cols-[1.7fr_1fr]">
            <div className="panel p-s5 sm:p-s6">
              <ArrivalsChart points={days} />
            </div>
            <div className="panel p-s5 sm:p-s6">
              <h2 className="font-display mb-s4 text-lg font-bold">
                أين وصلت المراجعة
              </h2>
              <StatusList counts={statusCounts} total={total} />
            </div>
          </div>

          {/* ── الطلب ────────────────────────────────────────────────── */}
          <div className="panel mb-s5 p-s5 sm:p-s6">
            <DemandChart rows={demandRows} />
          </div>

          {/* ── التوزيعات ────────────────────────────────────────────── */}
          <div className="mb-s5 grid gap-s4 md:grid-cols-2">
            <div className="panel p-s5 sm:p-s6">
              <Distribution title="الجامعات" items={universities} />
            </div>
            <div className="panel p-s5 sm:p-s6">
              <Distribution title="المستوى الدراسي" items={levels} />
            </div>
          </div>

          {/* ── الجدول: هو «عرض الجدول» الذي توجبه قاعدة الإتاحة ─────── */}
          <section className="panel overflow-hidden p-s5 sm:p-s6">
            <h2 className="font-display mb-s5 text-lg font-bold">الطلبات</h2>
            <div className="-mx-s2 overflow-x-auto">
              <table className="w-full min-w-[52rem] text-start text-sm">
                <thead>
                  <tr className="text-[0.78rem] opacity-60">
                    {["المتقدّم", "الجامعة والمستوى", "الرغبات", "الحالة", "وصل"].map(
                      (h) => (
                        <th key={h} className="px-s3 pb-s3 text-start font-semibold">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-line align-top transition-colors hover:bg-bg-sunken"
                    >
                      <td className="px-s3 py-s3">
                        <div className="font-semibold">{r.full_name}</div>
                        <div className="mt-0.5 text-[0.78rem] opacity-65">
                          <span dir="ltr">{r.student_id}</span> ·{" "}
                          <span dir="ltr">{r.phone}</span>
                        </div>
                        <div className="text-[0.78rem] opacity-65">
                          <span dir="ltr">{r.email}</span>
                        </div>
                      </td>
                      <td className="px-s3 py-s3">
                        <div className="text-[0.84rem]">{r.university}</div>
                        <div className="text-[0.78rem] opacity-65">
                          {r.level} · {r.major}
                        </div>
                      </td>
                      <td className="px-s3 py-s3">
                        <ol className="flex flex-col gap-0.5 text-[0.8rem] opacity-80">
                          {[r.choice1, r.choice2, r.choice3].map((c, i) => (
                            <li key={`${r.id}-${i}`}>
                              <span dir="ltr" className="tabular-nums opacity-60">
                                {i + 1}
                              </span>{" "}
                              <PreferenceName value={c} />
                            </li>
                          ))}
                        </ol>
                      </td>
                      <td className="px-s3 py-s3">
                        <StatusPill value={r.status} />
                        {r.cv_path && (
                          <a
                            href={`/admin/cv/${r.id}`}
                            className="mt-s2 block text-[0.8rem] font-semibold text-accent hover:underline"
                          >
                            السيرة الذاتية
                          </a>
                        )}
                      </td>
                      <td className="px-s3 py-s3 text-[0.78rem] opacity-65">
                        <span dir="ltr">
                          {new Date(r.created_at).toLocaleDateString("ar-SA")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

/** الحالة كبسولةً ملوّنة — **ومعها اسمها نصًّا**، فاللون ثانويٌّ لا وحيد. */
function StatusPill({ value }: { value: string }) {
  const s = STATUSES.find((x) => x.key === value);
  if (!s) return <StatusName value={value} />;
  return (
    <span
      className="tag"
      style={{
        background: `color-mix(in oklab, ${s.color} 13%, transparent)`,
        borderColor: `color-mix(in oklab, ${s.color} 32%, transparent)`,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}
