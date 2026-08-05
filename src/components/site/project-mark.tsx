import type { Project } from "@/content/projects";

type ProjectMarkProps = {
  project: Project;
  /** الارتفاع بالبكسل — العرض يتبع نسبة الشعار */
  size?: number;
  className?: string;
};

/**
 * علامة المشروع.
 *
 * قرار الرئاسة: المشاريع تتميّز **بشكلها لا بلونها**. هوية ميسولوجي مثلًا
 * تشترك عمدًا في عائلة ألوان النادي، فلو اعتمدنا اللون وحده لما تميّزت —
 * شعارها الدوّار هو ما يفرّقها.
 *
 * حيث تتّسع المساحة (البطاقات) نعرض الشعار الحقيقي. وحيث لا تتّسع
 * (الشريط العلوي) نكتفي بشريحة اللون كعلامة إرشاد لا كهوية.
 *
 * إن لم يصل ملف الشعار بعد، نرجع إلى الشريحة — ولا نرسم شعارًا بالتقدير:
 * علامة تجارية مُعاد رسمها بالعين تُشحن ثم يصعب سحبها.
 */
export function ProjectMark({ project, size = 28, className }: ProjectMarkProps) {
  if (project.markSrc) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element --
         شعارات ثابتة محلّية بصيغة SVG: لا تحتاج معالجة next/image، وتفعيلها
         لـ SVG يستلزم `dangerouslyAllowSVG` وهو توسيع غير مبرَّر للسطح. */
      <img
        src={project.markSrc}
        alt=""
        aria-hidden
        height={size}
        width={size}
        className={className}
        style={{ height: size, width: "auto" }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`mis-slant inline-block w-1.5 shrink-0 ${className ?? ""}`}
      style={{ height: size * 0.6, background: project.accent ?? "var(--line-control)" }}
    />
  );
}
