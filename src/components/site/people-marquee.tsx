import Image from "next/image";

import type { Person } from "@/content/people";
import { isolateLatin } from "@/lib/bidi";

/**
 * شريط الأشخاص المنساب.
 *
 * البطاقات مكرّرة مرّتين والمسار يزحف نصف عرضه، فيدور بلا قفزة — انظر
 * `.marquee` في `globals.css`. النسخة الثانية مخفيّة عن قارئ الشاشة
 * (`aria-hidden`) وإلا نطق كل اسم مرّتين.
 *
 * يقف عند المرور وعند وصول التركيز، ومع تقليل الحركة يقف تمامًا ويصير
 * قابلًا للسحب — فلا يضيع محتوى على من لا يحتمل الحركة.
 *
 * الصورة اختيارية: من لم تصل صورته تُعرض بطاقته بحرفه الأول في مربّع
 * من ألوان النظام — لا صورة رمادية مُقدَّرة ولا وجه مُخترع.
 */

type PeopleMarqueeProps = {
  people: readonly Person[];
  /** مدّة الدورة الكاملة — صفّان بمدّتين مختلفتين لا يُقرآن كتلة واحدة */
  run: string;
  label: string;
};

function Card({ person, echo }: { person: Person; echo?: boolean }) {
  return (
    <li
      /* النسخة المكرّرة موجودة للدوران البصري فقط — تُخفى عن قارئ الشاشة
         وعن ترتيب التنقّل، وإلا نُطق كل اسم مرّتين وتكرّر التركيز. */
      /* و`inert` قيمةٌ منطقية في React 19 — كانت سلسلةً فارغة في 18. */
      {...(echo ? { "aria-hidden": true, inert: true } : {})}
      className="flex w-[15rem] shrink-0 flex-col gap-s2 border border-line bg-bg-raised p-s4"
    >
      <div className="flex items-center gap-s3">
        {person.photo ? (
          <Image
            src={person.photo}
            alt=""
            width={44}
            height={44}
            className="size-11 shrink-0 object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="mis-slant flex size-11 shrink-0 items-center justify-center bg-bg-sunken font-display text-lg font-bold text-accent"
          >
            <span>{person.name.trim().charAt(0)}</span>
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-[0.9rem] font-semibold text-fg">
            {isolateLatin(person.name)}
          </p>
          <p className="truncate text-[0.78rem] text-fg-muted">
            {isolateLatin(person.role)}
          </p>
        </div>
      </div>

      {person.quote ? (
        <p className="text-[0.82rem] leading-relaxed text-fg-muted">
          {isolateLatin(person.quote)}
        </p>
      ) : null}

      {person.cohort ? (
        <p className="mt-auto text-[0.75rem] text-fg-muted">
          دفعة <span dir="ltr">{person.cohort}</span>
        </p>
      ) : null}
    </li>
  );
}

export function PeopleMarquee({ people, run, label }: PeopleMarqueeProps) {
  if (people.length === 0) return null;

  return (
    <div className="marquee" role="group" aria-label={label}>
      <ul
        className="marquee-track"
        style={{ "--marquee-run": run } as React.CSSProperties}
      >
        {people.map((person) => (
          <Card key={person.name} person={person} />
        ))}
        {/* النسخة الثانية تُكمل الدوران، ولا تُنطق مرّة ثانية */}
        {people.map((person) => (
          <Card key={`echo-${person.name}`} person={person} echo />
        ))}
      </ul>
    </div>
  );
}
