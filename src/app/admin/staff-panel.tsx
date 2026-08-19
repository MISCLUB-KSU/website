"use client";

import { useMemo, useState, useTransition } from "react";

import { COMMITTEES } from "@/content/committees";
import { PROJECTS } from "@/content/projects";
import { isolateLatin } from "@/lib/bidi";
import { removeStaff, saveStaff } from "./actions";

/**
 * **شاشةُ الطاقم — وبها يزول أثقلُ مانعٍ في الموسم.**
 *
 * ⚠️ **المانعُ لم يكن صلاحيّةً بل شاشة.** سياسةُ «الرئاسة تدير الطاقم» على
 * `staff` قائمةٌ بـ`ALL` منذ البداية وشرطُها `current_staff_role() = 'admin'`
 * — أي أن الرئاسة كانت **تستطيع** إضافةَ القادة بجلستها. والذي كان ينقص
 * موضعًا يُضغط فيه، فبقي الطريقُ الوحيد قالبَ SQL يُملأ بأسماءٍ وبُرد
 * ويُشغَّل على قاعدةٍ حيّة — **فبقي جدولُ الطاقم ثلاثةَ صفوفٍ كلُّها رئاسة،
 * وصفرَ قادة**، وكلُّ ما بُني للقائد لا يفتحه أحد.
 *
 * ⚠️ **ولا أسماءَ في المستودع.** الأسماءُ والبُردُ تُكتب هنا وتعيش في
 * القاعدة وحدها — وهو ما تقتضيه قاعدةُ النادي، وما كان القالبُ يخالفه كلّما
 * مُلئ في نسخةٍ محلّيّةٍ تضيع عند تبديل الدورة.
 *
 * ⚠️ **والنطاقاتُ تُختار لا تُكتب.** `inScopes` تطابق ببادئة، فحرفٌ زائدٌ في
 * `committee:media` يجعل القائدَ يفتح شاشةً فارغةً بلا رسالةِ خطأ. فالقائمةُ
 * مشتقّةٌ من `COMMITTEES` و`PROJECTS` — نفسِ ما تُبنى منه قيمُ الرغبات.
 */

export type StaffRow = {
  email: string;
  role: string;
  scopes: string[] | null;
  display_name: string | null;
  created_at: string;
};

/** نفسُ اشتقاق `SCOPE_OPTIONS` في شاشة الطلبات — ومصدرُهما واحد */
const SCOPES: readonly { value: string; label: string }[] = [
  ...COMMITTEES.map((c) => ({
    value: `committee:${c.slug}`,
    label: c.name,
  })),
  ...PROJECTS.filter((p) => p.applicationState === "open").map((p) => ({
    value: `project:${p.slug}`,
    label: p.name,
  })),
];

export function StaffPanel({
  rows,
  me,
}: {
  rows: readonly StaffRow[];
  /** بريدُ القارئ — به يُمنع حذفُ النفس قبل أن يُردّ من الخادم */
  me: string;
}) {
  const [list, setList] = useState<StaffRow[]>([...rows]);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  /** الصفُّ المفتوح للتعديل — وبريدٌ فارغٌ يعني «إضافةُ جديد» */
  const [editing, setEditing] = useState<StaffRow | null>(null);

  const leaders = useMemo(
    () => list.filter((r) => r.role === "leader").length,
    [list],
  );
  const admins = useMemo(
    () => list.filter((r) => r.role === "admin").length,
    [list],
  );

  const submit = (formData: FormData) =>
    start(async () => {
      const res = await saveStaff(formData);
      setNote({ ok: res.ok, text: res.message });
      if (res.ok && res.row) {
        const row = res.row as StaffRow;
        setList((prev) => {
          const at = prev.findIndex((r) => r.email === row.email);
          if (at === -1) return [...prev, row];
          const next = [...prev];
          next[at] = row;
          return next;
        });
        setEditing(null);
      }
    });

  const drop = (email: string) =>
    start(async () => {
      const res = await removeStaff(email);
      setNote({ ok: res.ok, text: res.message });
      if (res.ok) setList((prev) => prev.filter((r) => r.email !== email));
    });

  return (
    <div className="flex flex-col gap-s3">
      <section className="tile flex flex-wrap items-center gap-x-s5 gap-y-s2 px-s5 py-s3 text-[0.84rem]">
        <span>
          <b className="tabular-nums" dir="ltr">
            {leaders}
          </b>{" "}
          <span className="text-fg-muted">قائدًا</span>
        </span>
        <span>
          <b className="tabular-nums" dir="ltr">
            {admins}
          </b>{" "}
          <span className="text-fg-muted">رئاسة</span>
        </span>
        {/* ⚠️ **يُقال صراحةً حين لا قائدَ بعد.** الشاشةُ الفارغة تُقرأ
            «تعمل ولا شيء فيها»، والحقيقةُ أن كلَّ ما بُني للقادة معطَّلٌ
            حتى يُضاف أوّلُهم. */}
        {leaders === 0 && (
          <span className="text-warning font-semibold">
            ⚠️ لا قائدَ في الطاقم — ولا أحدَ يقدر يفتح شاشةَ الطلبات غيرُكم
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            setNote(null);
            setEditing({
              email: "",
              role: "leader",
              scopes: [],
              display_name: null,
              created_at: "",
            });
          }}
          className="text-accent ms-auto min-h-11 lg:min-h-9 text-[0.8rem] font-semibold underline underline-offset-4"
        >
          + أضف عضوًا
        </button>
      </section>

      {note && (
        <p
          role="status"
          className={`tile px-s5 py-s2 text-[0.82rem] font-medium ${
            note.ok ? "" : "text-danger"
          }`}
        >
          {note.text}
        </p>
      )}

      {editing && (
        <StaffForm
          row={editing}
          pending={pending}
          onCancel={() => setEditing(null)}
          onSubmit={submit}
        />
      )}

      <section className="tile px-s5 py-s4">
        <h2 className="font-display text-fg mb-s3 text-[0.95rem] font-bold">
          الطاقم ({list.length})
        </h2>
        <ul className="flex flex-col gap-s2">
          {list.map((r) => (
            <li
              key={r.email}
              className="bg-bg-sunken flex flex-wrap items-center gap-x-s3 gap-y-s1 rounded-xl px-s3 py-s2"
            >
              <span className="text-fg min-w-0 flex-1 truncate text-[0.86rem] font-semibold">
                {r.display_name || (
                  <span dir="ltr" className="font-normal opacity-70">
                    {r.email}
                  </span>
                )}
              </span>
              <span
                className="shrink-0 rounded-full px-s2 py-[2px] text-[0.7rem] font-semibold"
                style={{
                  background:
                    r.role === "admin"
                      ? "color-mix(in oklab, var(--st-accepted) 18%, transparent)"
                      : "color-mix(in oklab, var(--d-cyan) 16%, transparent)",
                }}
              >
                {r.role === "admin" ? "رئاسة" : "قائد"}
              </span>
              <span className="text-fg-muted min-w-0 basis-full truncate text-[0.74rem] sm:basis-auto">
                {r.role === "admin"
                  ? "كل اللجان والمشاريع"
                  : isolateLatin(
                      (r.scopes ?? [])
                        .map(
                          (s) => SCOPES.find((o) => o.value === s)?.label ?? s,
                        )
                        .join(" · ") || "بلا نطاق",
                    )}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setNote(null);
                  setEditing(r);
                }}
                className="text-fg-muted min-h-9 shrink-0 text-[0.76rem] underline underline-offset-4"
              >
                عدِّل
              </button>
              {/* ⚠️ **زرُّ الحذف يغيب عن صفّك أنت.** الخادمُ يمنعه أيضًا،
                  لكنّ زرًّا يُضغط ثم يُردّ يعلّم القارئَ ألّا يثق بالأزرار. */}
              {r.email !== me && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => drop(r.email)}
                  className="text-danger min-h-9 shrink-0 text-[0.76rem] underline underline-offset-4"
                >
                  احذف
                </button>
              )}
            </li>
          ))}
          {list.length === 0 && (
            <li className="text-fg-muted p-s5 text-center text-[0.85rem]">
              لا صفَّ بعد.
            </li>
          )}
        </ul>
      </section>

      <p className="text-fg-muted px-s2 text-[0.76rem] leading-relaxed">
        العضوُ يدخل من <span dir="ltr">/admin/login</span> ببريده نفسِه —
        يصله رمزٌ مؤقَّت، ولا كلمةَ مرور. ومن ليس هنا لا يُرسَل له شيء.
      </p>
    </div>
  );
}

function StaffForm({
  row,
  pending,
  onCancel,
  onSubmit,
}: {
  row: StaffRow;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const isNew = !row.created_at;
  const [role, setRole] = useState(row.role);

  return (
    <form
      action={onSubmit}
      className="tile flex flex-col gap-s3 px-s5 py-s4"
      style={{
        borderColor: "color-mix(in oklab, var(--d-cyan) 55%, transparent)",
      }}
    >
      <h2 className="font-display text-fg text-[0.95rem] font-bold">
        {isNew ? "عضوٌ جديد" : "تعديل"}
      </h2>

      <label className="flex flex-col gap-s1 text-[0.8rem]">
        <span className="text-fg-muted">البريد</span>
        {/* ⚠️ **البريدُ لا يُعدَّل، فهو المفتاح.** تعديلُه يصنع صفًّا ثانيًا
            ويترك الأوّلَ قائمًا بصلاحيّته — أي عضوًا لا يعرف أحدٌ به. */}
        <input
          name="email"
          type="email"
          required
          dir="ltr"
          readOnly={!isNew}
          defaultValue={row.email}
          placeholder="name@example.com"
          className="border-line-control text-fg min-h-11 rounded-xl border bg-transparent px-s3 text-[0.85rem] read-only:opacity-60"
        />
      </label>

      <label className="flex flex-col gap-s1 text-[0.8rem]">
        <span className="text-fg-muted">الاسم كما يُعرض له</span>
        <input
          name="display_name"
          type="text"
          defaultValue={row.display_name ?? ""}
          placeholder="اختياريّ — يظهر في ترويسة لوحته وفي ملاحظاته"
          className="border-line-control text-fg min-h-11 rounded-xl border bg-transparent px-s3 text-[0.85rem]"
        />
      </label>

      <fieldset className="flex flex-wrap items-center gap-x-s4 gap-y-s2 text-[0.8rem]">
        <legend className="text-fg-muted mb-s1">الدور</legend>
        {[
          { v: "leader", l: "قائد — نطاقُه وحدَه" },
          { v: "admin", l: "رئاسة — الكلّ، وتدير الطاقم" },
        ].map((o) => (
          <label key={o.v} className="flex items-center gap-x-s2">
            <input
              type="radio"
              name="role"
              value={o.v}
              checked={role === o.v}
              onChange={() => setRole(o.v)}
              className="size-4 accent-[var(--d-cyan)]"
            />
            {o.l}
          </label>
        ))}
      </fieldset>

      {/* ⚠️ **تُخفى للرئاسة لا تُعطَّل.** نطاقُها الكلّ، ومصفوفتُها فارغةٌ
          عمدًا — فمربّعاتٌ معطَّلةٌ أمامها تقول إن ثمّة شيئًا فاتها. */}
      {role === "leader" && (
        <fieldset className="flex flex-col gap-s2 text-[0.8rem]">
          <legend className="text-fg-muted mb-s1">
            النطاق — ما يستقبل طلباتِه
          </legend>
          <div className="grid gap-x-s4 gap-y-s2 sm:grid-cols-2">
            {SCOPES.map((s) => (
              <label key={s.value} className="flex items-center gap-x-s2">
                <input
                  type="checkbox"
                  name="scopes"
                  value={s.value}
                  defaultChecked={(row.scopes ?? []).includes(s.value)}
                  className="size-4 shrink-0 accent-[var(--d-cyan)]"
                />
                <span className="min-w-0 truncate">{isolateLatin(s.label)}</span>
              </label>
            ))}
          </div>
          <p className="text-fg-muted text-[0.74rem]">
            وحداتُ اللجنة تتبع لجنتَها تلقائيًّا — فاختيارُ اللجنة يكفي.
          </p>
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-x-s3 gap-y-s2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-xl px-s5 text-[0.82rem] font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-fg)" }}
        >
          {pending ? "…يُحفظ" : "احفظ"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-fg-muted min-h-11 text-[0.8rem] underline underline-offset-4"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
