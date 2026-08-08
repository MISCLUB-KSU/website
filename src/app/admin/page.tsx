import { findPreference } from "@/content/preferences";
import { isolateLatin } from "@/lib/bidi";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./login/actions";

/**
 * لوحة الطلبات.
 *
 * ⚠️ **لا فلترةَ نطاقٍ في هذا الملفّ إطلاقًا، وهذا مقصود.** الاستعلام
 * `select("*")` بلا شرط، والذي يقصّه هو `RLS` في القاعدة: قائد اللجنة
 * يستقبل صفوف نطاقه وحده، ومن ليس في `staff` يستقبل صفرًا. لو فُلتِر هنا
 * لصار الأمان في الواجهة — وواجهةٌ يمكن تجاوزها باستدعاءٍ مباشر.
 *
 * فحصُ العزل مسجَّلٌ في هجرة `rls_scope_isolation`: خمسة أدوارٍ جُرّبت،
 * والغريب يرى صفرًا، والحقن مرفوض.
 */

export const metadata = { title: "طلبات العضوية", robots: { index: false } };
/* الصفحة تعرض بياناتٍ حيّة لكلّ مستخدمٍ بجلسته — لا تُخزَّن ولا تُبنى مسبقًا */
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  new: "جديد",
  reviewing: "قيد المراجعة",
  accepted: "مقبول",
  rejected: "معتذَر عنه",
};

function preferenceName(value: string): string {
  return findPreference(value)?.fullLabel ?? value;
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

  const { data: rows, error } = await supabase
    .from("applications")
    .select("*")
    .order("created_at", { ascending: false });

  /* من ليس في الطاقم يصل إلى هنا بجلسةٍ صحيحة ويرى صفرًا. تُقال له الحقيقة
     بدل جدولٍ فارغ يظنّه عطلًا فيراسلنا. */
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

  const scopeNames = (me.scopes ?? []).map(preferenceName);

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-12">
      <header className="mb-s7 flex flex-wrap items-start justify-between gap-s4">
        <div>
          <h1 className="text-deep text-2xl font-bold sm:text-3xl">
            طلبات العضوية
          </h1>
          <p className="text-fg-muted mt-s2 text-sm leading-relaxed">
            {me.role === "admin" ? (
              <>كل الطلبات — {rows?.length ?? 0} طلبًا.</>
            ) : (
              <>
                طلبات نطاقك ({scopeNames.join(" · ") || "بلا نطاق"}) —{" "}
                {rows?.length ?? 0} طلبًا.
              </>
            )}
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="text-fg-muted hover:text-accent min-h-11 text-sm font-medium transition-colors"
          >
            خروج
          </button>
        </form>
      </header>

      {error && (
        <p role="alert" className="border-danger bg-danger/8 text-danger border-s-2 px-s4 py-s3">
          تعذّر جلب الطلبات.
        </p>
      )}

      {!error && (rows?.length ?? 0) === 0 && (
        <p className="text-fg-muted border-line border-t py-s7 text-center">
          ما وصل طلبٌ بعد.
        </p>
      )}

      {(rows?.length ?? 0) > 0 && (
        <div className="border-line overflow-x-auto border">
          <table className="w-full min-w-[52rem] text-start text-sm">
            <thead className="bg-bg-sunken text-fg">
              <tr>
                {["المتقدّم", "الجامعة والمستوى", "الرغبات", "الحالة", "وصل"].map(
                  (h) => (
                    <th key={h} className="px-s4 py-s3 text-start font-semibold">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows?.map((r) => (
                <tr key={r.id} className="border-line border-t align-top">
                  <td className="px-s4 py-s3">
                    <div className="text-fg font-medium">{r.full_name}</div>
                    <div className="text-fg-muted mt-0.5 text-[0.8rem]">
                      <span dir="ltr">{r.student_id}</span> ·{" "}
                      <span dir="ltr">{r.phone}</span>
                    </div>
                    <div className="text-fg-muted text-[0.8rem]">
                      <span dir="ltr">{r.email}</span>
                    </div>
                  </td>
                  <td className="px-s4 py-s3 text-fg-muted">
                    <div>{r.university_other || r.university}</div>
                    <div className="text-[0.8rem]">
                      {r.level} · {r.major_other || r.major}
                    </div>
                  </td>
                  <td className="px-s4 py-s3">
                    <ol className="text-fg-muted flex flex-col gap-0.5 text-[0.82rem]">
                      {[r.choice1, r.choice2, r.choice3].map((c, i) => (
                        <li key={`${r.id}-${i}`}>
                          <span dir="ltr" className="tabular-nums">
                            {i + 1}
                          </span>{" "}
                          {isolateLatin(preferenceName(c))}
                        </li>
                      ))}
                    </ol>
                  </td>
                  <td className="px-s4 py-s3 text-fg-muted">
                    {STATUS_LABEL[r.status] ?? r.status}
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
      )}
    </main>
  );
}
