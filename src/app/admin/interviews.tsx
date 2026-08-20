"use client";

import { useMemo } from "react";

import { findPreference } from "@/content/preferences";
import { useHydrated } from "@/lib/use-hydrated";
import {
  INTERVIEW_MINUTES,
  choiceAtStage,
  inScopes,
  interviewDayKey,
  interviewDayLabel,
  interviewTime,
  whatsappHref,
  type Row,
} from "./stats";

/**
 * **لوحُ المقابلات — يومُ القائد لا أرقامُه.**
 *
 * ⚠️ **الفجوةُ مقيسةٌ في الشيفرة لا مفترَضة:** `interview_at` عمودٌ يُضبط،
 * ولم يكن يقرؤه شيءٌ إلّا **خيارُ ترتيبٍ** في القائمة و**وسمٌ** في الصفّ.
 * فالقائدُ الذي حجز خمسةَ عشرَ موعدًا (وهو إرشادُ جهةٍ متوسّطة) لم يكن يملك أن
 * يسأل «ما عندي غدًا؟» إلّا بأن يرتّب ٥٧ صفًّا ويقرأها بعينه.
 *
 * وثلاثةُ أسئلةٍ يجيبها هذا اللوح، وكلُّها عملٌ لا إحصاء:
 *
 * 1. **من دُعي ولم يُحدَّد له موعد** — وعدٌ معلَّق. وهو أخطرُ الثلاثة لأنه
 *    **لا يظهر في أيّ عدّاد**: حالتُه `reviewing` فيُحسب «مدعوًّا» في
 *    المقاييس، ولا موعدَ له في الواقع. فيُصدَّر هنا فوق كلّ شيء.
 * 2. **ما عندي، ومتى** — مجموعًا بأيّامه لا قائمةً مسطّحة.
 * 3. **أحجزتُ اثنين في وقتٍ واحد؟** — انظر `interviewClashes`.
 *
 * ⚠️ **ولا زرَّ قرارٍ هنا عمدًا.** القرارُ يُتّخذ في الملفّ حيث تُقرأ السيرةُ
 * والدوافع؛ ولوحٌ يقبل ويرفض من سطرٍ فيه اسمٌ وساعةٌ يدعو إلى حكمٍ بلا
 * قراءة. وواتساب وحدَه هنا لأنه **تنسيقٌ لا حكم**.
 */
export function Interviews({
  rows,
  scopes,
  isAdmin,
  phase,
}: {
  rows: readonly Row[];
  scopes: readonly string[];
  isAdmin: boolean;
  phase: number;
}) {
  /* ⚠️ الوقتُ يُقرأ بعد الترطيب وحدَه: `Date.now()` في الرسم يعني ترتيبَ
     خادمٍ يخالف ترتيبَ عميل — وهو اختلافُ ترطيبٍ يعيد رسمَ اللوح كلِّه. */
  const live = useHydrated();

  /** صفوفُ القارئ — بالقصّ نفسِه الذي يقصّ به طابورُ القائمة */
  const mine = useMemo(
    () =>
      isAdmin
        ? rows
        : rows.filter(
            (r) => r.stage <= phase && inScopes(choiceAtStage(r), scopes),
          ),
    [rows, isAdmin, scopes, phase],
  );

  /** دُعي ولم يُحدَّد له موعد — وعدٌ معلَّقٌ لا يظهر في عدّاد */
  const unscheduled = useMemo(
    () => mine.filter((r) => r.status === "reviewing" && !r.interview_at),
    [mine],
  );

  /**
   * المواعيدُ القائمة — **بلا من حُسم أمرُه**.
   *
   * موعدُ مقبولٍ أو معتذَرٍ عنه أثرٌ لم يُمسح، لا لقاءٌ يُحضَّر له. وعرضُه
   * يملأ اليومَ بأسماءٍ لن يقابلها أحد.
   */
  const booked = useMemo(
    () =>
      mine
        .filter(
          (r) =>
            r.interview_at &&
            r.status !== "accepted" &&
            r.status !== "rejected",
        )
        .sort(
          (a, b) =>
            Date.parse(a.interview_at ?? "") - Date.parse(b.interview_at ?? ""),
        ),
    [mine],
  );

  /**
   * المتعارضون — **يُحسبان مرّةً لكلّ اللوح لا لكلّ سطر**.
   *
   * الحسابُ داخل السطر يعني مقارنةَ كلِّ موعدٍ بكلّ موعدٍ في كلّ رسم. وهنا
   * مسحةٌ واحدةٌ على قائمةٍ **مرتّبةٍ أصلًا**: يكفي أن يُقارن كلُّ موعدٍ
   * بتاليه ما دام الفرقُ دون النافذة.
   */
  const clashing = useMemo(() => {
    const out = new Set<string>();
    const window = INTERVIEW_MINUTES * 60_000;
    for (let i = 0; i < booked.length; i++) {
      const a = Date.parse(booked[i].interview_at ?? "");
      for (let j = i + 1; j < booked.length; j++) {
        const b = Date.parse(booked[j].interview_at ?? "");
        if (b - a >= window) break;
        out.add(booked[i].id);
        out.add(booked[j].id);
      }
    }
    return out;
  }, [booked]);

  /** مجموعةً بأيّامها — والترتيبُ محفوظٌ من `booked` فلا يُعاد */
  const days = useMemo(() => {
    const m = new Map<string, { label: string; at: string; rows: Row[] }>();
    for (const r of booked) {
      const iso = r.interview_at as string;
      const key = interviewDayKey(iso);
      const day = m.get(key);
      if (day) day.rows.push(r);
      else
        m.set(key, { label: interviewDayLabel(iso), at: key, rows: [r] });
    }
    return [...m.values()];
  }, [booked]);

  /* ⚠️ **مفتاحُ اليوم بتوقيت الرياض لا بـ`toISOString`.** الثانيةُ تُرجع
     يومًا عالميًّا، فبين منتصف الليل والثالثة فجرًا بالرياض تكون قد سبقتها
     بيوم — أي أن مقابلاتِ **اليوم** تُوسم «ماضية» وتبهت في تلك الساعات. */
  const today = live ? interviewDayKey(new Date().toISOString()) : "";

  return (
    <div className="flex flex-col gap-s3">
      <Summary
        booked={booked.length}
        unscheduled={unscheduled.length}
        clashes={clashing.size}
      />

      {unscheduled.length > 0 && (
        <section
          className="tile px-s5 py-s4"
          style={{
            borderColor: "color-mix(in oklab, var(--warning) 55%, transparent)",
            background: "color-mix(in oklab, var(--warning) 10%, transparent)",
          }}
        >
          <h2 className="font-display text-fg mb-s1 text-[0.95rem] font-bold">
            دُعوا للمقابلة ولا موعدَ لهم ({unscheduled.length})
          </h2>
          {/* ⚠️ يُقال لماذا يصدَّر: العدّاداتُ تعدّهم «مدعوّين» فيبدو الشغلُ
              ماضيًا، وهم في الواقع ينتظرون رسالةً لم تُرسَل. */}
          <p className="text-fg-muted mb-s3 text-[0.78rem] leading-relaxed">
            حالتُهم «دعوةٌ لمقابلة» فتعدُّهم المقاييسُ مدعوّين — ولا موعدَ في
            الواقع. حدِّد موعدَ كلٍّ منهم من ملفّه.
          </p>
          <ul className="flex flex-col gap-s2">
            {unscheduled.map((r) => (
              <Line key={r.id} row={r} />
            ))}
          </ul>
        </section>
      )}

      {days.map((d) => {
        /* ⚠️ الماضي يبهت ولا يُخفى: القائدُ يراجع من قابلهم أمسِ */
        const past = live && d.at < today;
        return (
          <section
            key={d.at}
            className={`tile px-s5 py-s4 ${past ? "opacity-55" : ""}`}
          >
            <h2 className="font-display text-fg mb-s3 flex items-baseline gap-x-s2 text-[0.95rem] font-bold">
              {d.label}
              <span className="text-fg-muted text-[0.76rem] font-normal">
                {d.rows.length} مقابلة
                {live && d.at === today && " · اليوم"}
              </span>
            </h2>
            <ul className="flex flex-col gap-s2">
              {d.rows.map((r) => (
                <Line
                  key={r.id}
                  row={r}
                  time={interviewTime(r.interview_at as string)}
                  clash={clashing.has(r.id)}
                />
              ))}
            </ul>
          </section>
        );
      })}

      {booked.length === 0 && unscheduled.length === 0 && (
        <section className="tile p-s7 text-center">
          <p className="text-fg-muted text-[0.9rem]">
            لا مقابلةَ محجوزة. اضبط «موعد المقابلة» في ملفّ من دعوتَه، فيظهر
            هنا.
          </p>
        </section>
      )}
    </div>
  );
}

function Summary({
  booked,
  unscheduled,
  clashes,
}: {
  booked: number;
  unscheduled: number;
  clashes: number;
}) {
  return (
    <section className="tile flex flex-wrap items-center gap-x-s5 gap-y-s2 px-s5 py-s3 text-[0.84rem]">
      <span>
        <b className="tabular-nums" dir="ltr">
          {booked}
        </b>{" "}
        <span className="text-fg-muted">مقابلة محجوزة</span>
      </span>
      <span>
        <b className="tabular-nums" dir="ltr">
          {unscheduled}
        </b>{" "}
        <span className="text-fg-muted">بلا موعد</span>
      </span>
      {/* ⚠️ لا تظهر صفرًا: «٠ تعارض» سطرٌ يشغل مكانًا ليقول إن لا شيء */}
      {clashes > 0 && (
        <span className="text-warning font-semibold">
          ⚠️ {clashes} موعدًا متداخلة
        </span>
      )}
    </section>
  );
}

/** سطرٌ واحد: الساعةُ · الاسمُ · الجهةُ · واتساب */
function Line({
  row,
  time,
  clash,
}: {
  row: Row;
  time?: string;
  clash?: boolean;
}) {
  const wa = whatsappHref(row);
  const at = choiceAtStage(row);
  const unit = findPreference(at)?.label ?? at;
  return (
    <li className="bg-bg-sunken flex flex-wrap items-center gap-x-s3 gap-y-s1 rounded-xl px-s3 py-s2">
      {time && (
        <span
          dir="ltr"
          className="text-fg w-[5rem] shrink-0 text-[0.84rem] font-bold tabular-nums"
        >
          {time}
        </span>
      )}
      {/* ⚠️ **الاسمُ ضِعفا الجهة في القسمة — والجهةُ كانت لا تنكمش أصلًا.**
          كان الاسمُ `flex-1` (أساسُه صفر) والجهةُ بلا `flex` (أساسُها
          محتواها)، فجهةٌ طويلة مثل «مونتاج الفيديو والموشن جرافيك» تأخذ
          نصيبَها كاملًا ويُقصّ الاسمُ إلى «مُتق…». رُصد على 390px — والاسمُ
          هو الشيءُ الوحيد الذي يُقرأ في سطرِ موعد. */}
      <span className="text-fg min-w-0 flex-[2_1_6rem] truncate text-[0.86rem] font-semibold">
        {row.full_name}
      </span>
      <span className="text-fg-muted min-w-0 flex-[1_1_4rem] truncate text-[0.76rem]">
        {unit}
      </span>
      {clash && (
        <span
          className="text-warning text-[0.74rem] font-semibold"
          title={`موعدٌ آخر داخل ${INTERVIEW_MINUTES} دقيقة`}
        >
          ⚠️ متداخل
        </span>
      )}
      {/* ⚠️ لا يظهر لمن رقمُه لا يطابق الشكل السعوديّ — انظر `whatsappHref` */}
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent min-h-9 shrink-0 text-[0.78rem] font-semibold underline underline-offset-4"
        >
          واتساب
        </a>
      )}
    </li>
  );
}
