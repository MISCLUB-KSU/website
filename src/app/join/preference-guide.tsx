import { CommitteeMark } from "@/components/site/committee-mark";
import { COMMITTEES } from "@/content/committees";
import { PROJECTS } from "@/content/projects";
import { isolateLatin } from "@/lib/bidi";

/**
 * تعريف ما يُقدَّم عليه — يُقرأ قبل الاختيار لا بعده.
 *
 * الطالب لا يعرف الفرق بين «وحدة الأرشيف والتقرير» و«وحدة العمليات» من
 * اسميهما، ولو اختار على التخمين خسر الطرفان. فالتعريفات هنا لا في صفحة
 * أخرى: القرار يُتّخذ في هذي الشاشة.
 *
 * `<details>` مفتوحة افتراضيًا — المحتوى ظاهر، والطيّ خيارٌ لمن يعرف
 * وجهته ويريد الوصول إلى القوائم. عنصر أصيل يعمل بلا جافاسكربت.
 */

type GroupProps = {
  title: string;
  note?: string;
  children: React.ReactNode;
};

function Group({ title, note, children }: GroupProps) {
  return (
    <details open className="border border-line bg-bg-raised">
      <summary className="flex min-h-[46px] cursor-pointer items-center justify-between gap-s3 px-s4 py-s3 text-sm font-semibold text-fg select-none">
        <span>{title}</span>
        {note && (
          <span className="text-[0.78rem] font-normal text-fg-muted">
            {note}
          </span>
        )}
      </summary>
      <div className="border-t border-line px-s4 py-s4">{children}</div>
    </details>
  );
}

type EntryProps = {
  name: string;
  description: string;
  meta?: React.ReactNode;
};

function Entry({ name, description, meta }: EntryProps) {
  return (
    <div className="border-s-2 border-line-strong ps-s3">
      <p className="text-[0.9rem] font-semibold text-fg">
        {isolateLatin(name)}
      </p>
      <p className="mt-0.5 text-[0.84rem] leading-relaxed text-fg-muted">
        {isolateLatin(description)}
      </p>
      {meta}
    </div>
  );
}

export function PreferenceGuide() {
  const projects = PROJECTS.filter((project) => !project.isExternal);
  const initiatives = PROJECTS.filter((project) => project.isExternal);

  return (
    <div className="flex flex-col gap-s3">
      <Group title="اللجان ووحداتها" note="لا بدّ من واحدة على الأقل">
        <div className="flex flex-col gap-s5">
          {COMMITTEES.map((committee) => (
            <section key={committee.slug} className="flex flex-col gap-s3">
              <div>
                {/* العلامة نفسها التي في صفحة اللجان — الطالب الذي تصفّحها
                    يتعرّف على لجنته هنا قبل أن يقرأ اسمها */}
                <h3 className="flex items-center gap-s2 font-display text-[0.95rem] font-semibold text-fg">
                  <CommitteeMark
                    icon={committee.mark}
                    className="size-5 shrink-0 text-accent"
                  />
                  {committee.name}
                </h3>
                <p className="mt-1 text-[0.84rem] leading-relaxed text-fg-muted">
                  {isolateLatin(committee.description)}
                </p>
              </div>

              {committee.units.length > 0 ? (
                <div className="flex flex-col gap-s3">
                  {committee.units.map((unit) => (
                    <Entry
                      key={unit.slug}
                      name={unit.name}
                      description={unit.description}
                    />
                  ))}
                </div>
              ) : (
                <p className="border-s-2 border-line-strong ps-s3 text-[0.82rem] text-fg-muted">
                  تعمل ككتلة واحدة — يُقدَّم عليها مباشرةً بلا وحدات.
                </p>
              )}
            </section>
          ))}
        </div>
      </Group>

      <Group title="المشاريع" note="فرق تُنفّذ برامج النادي">
        <div className="flex flex-col gap-s4">
          {projects.map((project) => (
            <Entry
              key={project.slug}
              name={project.name}
              description={project.summary}
              meta={
                project.programs && (
                  <p className="mt-1.5 text-[0.78rem] text-fg-muted">
                    البرامج:{" "}
                    {project.programs.map((program, index) => (
                      <span key={program.name}>
                        {index > 0 && " · "}
                        <span dir="ltr">{program.name}</span>
                      </span>
                    ))}
                  </p>
                )
              }
            />
          ))}
        </div>
      </Group>

      {initiatives.length > 0 && (
        <Group title="المبادرات" note="خارج مشاريع النادي الأساسية">
          <div className="flex flex-col gap-s4">
            {initiatives.map((initiative) => (
              <Entry
                key={initiative.slug}
                name={initiative.name}
                description={initiative.summary}
              />
            ))}
          </div>
        </Group>
      )}
    </div>
  );
}
