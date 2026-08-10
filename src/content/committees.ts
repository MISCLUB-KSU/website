/**
 * اللجان والوحدات — الهيكل المعتمد من عرض "اجتماع قادة المشاريع".
 *
 * هذا الهيكل يختلف عن الموقع السابق، والمعتمد هو ما هنا بقرار رئاسة النادي.
 * أبرز الفروق: "لجنة المشاريع" مستحدثة وتحتها مشاريع النادي الستة،
 * و"لجنة اللوجستيات" لم تعد ضمن الهيكل.
 *
 * ملاحظة خصوصية: أسماء رؤساء اللجان والوحدات موجودة في العرض ولم تُنقل هنا،
 * ولا تُنشر — بقرار رئاسة النادي.
 */

import type { CustomQuestion } from "./questions";

export type Unit = {
  slug: string;
  name: string;
  description: string;
  /** هل هذي الوحدة تستقبل طلبات هالترم؟ تتحكم فيها الإدارة */
  isOpen: boolean;
  /** أسئلة قائد الوحدة — تظهر لمن اختارها ضمن رغباته. انظر `questions.ts` */
  questions?: readonly CustomQuestion[];
};

/**
 * إيقاع علامة اللجنة — ثلاث ضربات بزاوية الشعار تفترق بارتفاعاتها.
 * تُرسم في `committee-mark.tsx`، والاسم هنا دلالة لا هندسة.
 * ⚠️ إضافة إلى نظام الهوية تنتظر اعتماد الرئاسة.
 */
export type CommitteeMarkShape =
  | "ascending"
  | "descending"
  | "flat"
  | "valley"
  | "peak";

export type Committee = {
  slug: string;
  name: string;
  description: string;
  mark: CommitteeMarkShape;
  /** لجان بإشراف الرئاسة مباشرة لا تتبع نائب الرئيس */
  reportsToPresidency?: boolean;
  /** بعض اللجان تعمل ككتلة واحدة بلا وحدات فرعية */
  units: readonly Unit[];
  /**
   * أسئلة قائد اللجنة — للجان التي تعمل ككتلة واحدة.
   * اللجنة ذات الوحدات يُقدَّم على وحداتها، فأسئلتها تُكتب في الوحدة.
   */
  questions?: readonly CustomQuestion[];
};

export const COMMITTEES: readonly Committee[] = [
  {
    slug: "public-relations",
    name: "لجنة العلاقات العامة والشراكات",
    mark: "descending",
    description:
      "تبني علاقات النادي مع الجهات الخارجية والرعاة، وتنظّم تواصله الداخلي.",
    reportsToPresidency: true,
    units: [
      {
        slug: "sponsorship",
        name: "وحدة الرعايات والشراكات",
        description: "التواصل مع الرعاة والجهات الداعمة وبناء الشراكات.",
        isOpen: true,
      },
      {
        slug: "visits",
        name: "وحدة الزيارات",
        description: "تنظيم الزيارات الميدانية للشركات والجهات.",
        isOpen: true,
      },
      {
        slug: "internal-comms",
        name: "وحدة التواصل الداخلي",
        description: "ربط اللجان ببعضها وضمان وصول المعلومة داخل النادي.",
        isOpen: true,
      },
    ],
  },
  {
    slug: "human-resources",
    name: "لجنة الموارد البشرية",
    mark: "flat",
    description:
      "إدارة الأعضاء والمتطوعين، ومتابعة ساعاتهم، وتنظيم عمليات التسجيل.",
    units: [],
  },
  {
    slug: "finance-operations",
    name: "لجنة الموارد المالية والتنظيمية",
    mark: "valley",
    description:
      "تنظيم الشؤون الإدارية والمالية، وتوثيق أعمال النادي وتقاريره.",
    units: [
      {
        slug: "archive",
        name: "وحدة الأرشيف والتقرير",
        description: "توثيق أعمال النادي وإعداد التقارير الدورية.",
        isOpen: true,
      },
      {
        slug: "operations",
        name: "وحدة العمليات",
        description: "تجهيز متطلبات الفعاليات وتنسيق تنفيذها.",
        isOpen: true,
      },
      {
        slug: "budget",
        name: "وحدة إدارة الميزانية",
        description: "ضبط المصروفات ومتابعة ميزانية النادي ومشاريعه.",
        isOpen: true,
      },
    ],
  },
  {
    slug: "media",
    name: "اللجنة الإعلامية",
    mark: "peak",
    description:
      "تُبرز صورة النادي وتنشر أخباره وأنشطته عبر المحتوى البصري والتسويقي.",
    units: [
      {
        slug: "marketing",
        name: "وحدة التسويق",
        description: "الترويج للفعاليات والبرامج وإدارة حسابات النادي.",
        isOpen: true,
      },
      {
        slug: "photography",
        name: "وحدة التصوير",
        description: "تغطية الفعاليات بالصورة والفيديو.",
        isOpen: true,
      },
      {
        slug: "design",
        name: "وحدة التصميم",
        description: "إنتاج الهويات البصرية والمواد الإبداعية.",
        isOpen: true,
      },
    ],
  },
] as const;

export const ALL_UNITS = COMMITTEES.flatMap((committee) =>
  committee.units.map((unit) => ({
    ...unit,
    committeeSlug: committee.slug,
    committeeName: committee.name,
  })),
);

export function findCommittee(slug: string): Committee | undefined {
  return COMMITTEES.find((committee) => committee.slug === slug);
}

/** اللجان التي تعمل ككتلة واحدة — يُقدَّم عليها مباشرة لا على وحدة داخلها */
export const COMMITTEES_WITHOUT_UNITS = COMMITTEES.filter(
  (committee) => committee.units.length === 0,
);
