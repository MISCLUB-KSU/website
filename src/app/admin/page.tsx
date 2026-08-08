import { findPreference } from "@/content/preferences";
import { isolateLatin } from "@/lib/bidi";
import { createClient } from "@/lib/supabase/server";
import {
  ArrivalsChart,
  DemandChart,
  Distribution,
  StatusRibbon,
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
 * ولأن الصفوف تصل مقصوصةً، **كل رقمٍ في اللوحة يخصّ نطاق قارئها**: قائد
 * لجنةٍ يرى «الطلب» على نطاقه هو، والرئاسة ترى الصورة كاملة. هذا صحيحٌ
 * لا نقص: القائد لا يقرّر على ما لا يخصّه.
 *
 * فحصُ العزل مسجَّلٌ في هجرة `rls_scope_isolation`.
 */

export const metadata = { title: "طلبات العضوية", robots: { index: false } };
export const dynamic = "force-dynamic";

function StatusName({ value }: { value: string }) {
  const found = STATUSES.find((s) => s.key === value);
  return <>{found?.label ?? value}</>;
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
        <h1 className="text-deep mb-3 text-2xl font-bold">لا صلاحية لك</h1>
        <p className="text-fg-muted leading-relaxed">
          بريدك{" "}
          <span dir="ltr" className="font-medium">
            {user?.email}
          </span>{" "}
          ليس في طاقم الاطّلاع. راجع رئاسة النادي إن كان ينبغي أن يكون.
        </p>
        <form action={signOut} className="mt-s5">
          <button type="submit" className="text-accent text-sm font-medium">
            خروج
          </button>
        </form>
      </main>
    );
  }

  const rows = (data ?? []) as Row[];
  const total = rows.length;
  const statusCounts = Object.fromEntries(countBy(rows, (r) => r.status));
  const demandRows = demand(rows);
  const days = perDay(rows);
  const withCv = rows.filter((r) => r.cv_path).length;

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
    <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-s7">
      {/* ── الترويسة: الرقم هو التكوين، لا بطاقةٌ فيها أيقونة ────────── */}
      <header className="mb-s8 border-b border-line pb-s6">
        <div className="flex flex-wrap items-end justify-between gap-x-s6 gap-y-s4">
          <div>
            <p className="text-fg-muted mb-s2 text-[0.82rem]">
              {me.role === "admin"
                ? "كل اللجان والمشاريع"
                : scopeNames.join(" · ") || "بلا نطاق"}
            </p>
            <h1 className="font-display text-deep flex items-baseline gap-x-s3 text-5xl leading-none font-bold sm:text-6xl">
              <span dir="ltr" className="tabular-nums">
                {total}
              </span>
              <span className="text-fg text-xl font-bold sm:text-2xl">
                {total === 1 ? "طلب" : "طلبًا"}
              </span>
            </h1>
          </div>

          {/* ⚠️ النموذج **خارج** `<dl>`: `<form>` بين `<dt>`/`<dd>` تعشيشٌ
              غير صالح، يصحّحه المتصفّح بنقله فتنكسر الشبكة بلا خطأٍ ظاهر. */}
          <div className="flex flex-wrap items-end gap-x-s7 gap-y-s3">
            <dl className="flex flex-wrap gap-x-s7 gap-y-s3">
              <Figure
                label="بسيرة ذاتية"
                value={withCv}
                note={
                  total ? `${Math.round((withCv / total) * 100)}٪` : undefined
                }
              />
              <Figure label="جهةً مطلوبة" value={demandRows.length} />
              <Figure label="جامعةً" value={universities.length} />
            </dl>
            <form action={signOut}>
              <button
                type="submit"
                className="text-fg-muted hover:text-accent min-h-11 text-sm font-medium transition-colors"
              >
                خروج
              </button>
            </form>
          </div>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="border-danger bg-danger/8 text-danger mb-s6 border-s-2 px-s4 py-s3"
        >
          تعذّر جلب الطلبات.
        </p>
      )}

      {total === 0 ? (
        <p className="text-fg-muted border-line border-t py-s8 text-center">
          ما وصل طلبٌ بعد.
        </p>
      ) : (
        <>
          <div className="mb-s8 grid gap-s8 lg:grid-cols-[1fr_auto] lg:items-start lg:gap-s9">
            <ArrivalsChart points={days} />
            <div className="lg:min-w-[19rem]">
              <StatusRibbon counts={statusCounts} total={total} />
            </div>
          </div>

          <div className="mb-s8 border-t border-line pt-s7">
            <DemandChart rows={demandRows} />
          </div>

          <div className="mb-s8 grid gap-s8 border-t border-line pt-s7 md:grid-cols-2 md:gap-s9">
            <Distribution title="الجامعات" items={universities} />
            <Distribution title="المستوى الدراسي" items={levels} />
          </div>

          {/* ── الجدول: هو «عرض الجدول» الذي توجبه قاعدة الإتاحة ─────── */}
          <section className="border-t border-line pt-s7">
            <h2 className="font-display text-fg mb-s5 text-lg font-bold">
              الطلبات
            </h2>
            <div className="border-line overflow-x-auto border">
              <table className="w-full min-w-[52rem] text-start text-sm">
                <thead className="bg-bg-sunken text-fg">
                  <tr>
                    {["المتقدّم", "الجامعة والمستوى", "الرغبات", "الحالة", "وصل"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-s4 py-s3 text-start font-semibold"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-line border-t align-top">
                      <td className="px-s4 py-s3">
                        <div className="text-fg font-medium">
                          {r.full_name}
                        </div>
                        <div className="text-fg-muted mt-0.5 text-[0.8rem]">
                          <span dir="ltr">
                            {r.student_id}
                          </span>{" "}
                          ·{" "}
                          <span dir="ltr">
                            {r.phone}
                          </span>
                        </div>
                        <div className="text-fg-muted text-[0.8rem]">
                          <span dir="ltr">
                            {r.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-s4 py-s3 text-fg-muted">
                        <div>{r.university}</div>
                        <div className="text-[0.8rem]">
                          {r.level} · {r.major}
                        </div>
                      </td>
                      <td className="px-s4 py-s3">
                        <ol className="text-fg-muted flex flex-col gap-0.5 text-[0.82rem]">
                          {[r.choice1, r.choice2, r.choice3].map((c, i) => (
                            <li key={`${r.id}-${i}`}>
                              <span dir="ltr" className="tabular-nums">
                                {i + 1}
                              </span>{" "}
                              <PreferenceName value={c} />
                            </li>
                          ))}
                        </ol>
                      </td>
                      <td className="px-s4 py-s3 text-fg-muted">
                        <StatusName value={r.status} />
                        {r.cv_path && (
                          <a
                            href={`/admin/cv/${r.id}`}
                            className="text-accent mt-s2 block text-[0.82rem] font-medium"
                          >
                            السيرة الذاتية
                          </a>
                        )}
                      </td>
                      <td className="px-s4 py-s3 text-fg-muted text-[0.8rem]">
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

/** رقمٌ ووصفُه — بلا بطاقةٍ ولا حدٍّ ولا أيقونةٍ في مربّع */
function Figure({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note?: string;
}) {
  return (
    <div>
      <dt className="text-fg-muted text-[0.78rem]">{label}</dt>
      <dd className="text-fg mt-0.5 flex items-baseline gap-x-s2 text-2xl leading-none font-bold">
        <span dir="ltr" className="tabular-nums">
          {value}
        </span>
        {note && (
          <span className="text-fg-muted text-[0.78rem] font-medium" dir="ltr">
            {note}
          </span>
        )}
      </dd>
    </div>
  );
}
