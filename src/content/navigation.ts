/**
 * بنية التنقّل — مصدر واحد يقرأ منه الشريط العلوي والتذييل.
 *
 * ⚠️ **الشريط أُعيد ترتيبه في ٣ أغسطس ٢٠٢٦ بطلب مباشر:** ستة عناصر لا غير.
 * وهذا يلغي ترتيبين كانا موثَّقين هنا كتوجيه من الرئاسة:
 *   · «المشاريع الستة ترتفع إلى الشريط العلوي» — صارت رابطًا واحدًا
 *     إلى صفحة المشاريع بدل رفٍّ يعرض المشاريع بأسمائها وألوانها.
 *   · «اللجان» و«المقالات» خرجتا من الشريط إلى التذييل.
 * يُراجَع هذا مع الرئاسة قبل النشر.
 *
 * «حول النادي» صار «من نحن»، ويجمع النبذة والهيكلة واللجان والشراكات.
 */

export type NavLink = {
  label: string;
  href: string;
};

export type NavSection = {
  label: string;
  href: string;
  children?: readonly NavLink[];
};

/**
 * «من نحن» — مظلّة ما يشرح النادي نفسه.
 * «اللجان» تحتها: خرجت من الشريط العلوي، ولا تُترك بلا طريق إليها.
 */
export const ABOUT_SECTION: NavSection = {
  label: "من نحن",
  href: "/about",
  children: [
    { label: "نبذة عن النادي", href: "/about" },
    { label: "هيكلة النادي", href: "/about/structure" },
    { label: "اللجان", href: "/committees" },
    { label: "الشراكات", href: "/about/partnerships" },
  ],
};

/** الشريط العلوي — ستة عناصر، بالترتيب المطلوب */
export const NAVIGATION: readonly NavSection[] = [
  { label: "الرئيسية", href: "/" },
  { label: "الإنجازات", href: "/achievements" },
  { label: "المشاريع", href: "/projects" },
  ABOUT_SECTION,
  { label: "تواصل معنا", href: "/contact" },
  { label: "الأسئلة الشائعة", href: "/faq" },
];

/**
 * عمود «أقسام» في التذييل.
 * فيه ما خرج من الشريط — فلا تبقى صفحة بلا طريق إليها من أي مكان.
 */
export const FOOTER_LINKS: readonly NavLink[] = [
  { label: "الإنجازات", href: "/achievements" },
  { label: "المشاريع", href: "/projects" },
  { label: "المقالات", href: "/posts" },
  { label: "الأسئلة الشائعة", href: "/faq" },
  { label: "قدِّم للعضوية", href: "/join" },
];

/** رابط الإجراء الوحيد في الشريط — منفصل عن التنقّل عمدًا. */
export const PRIMARY_ACTION = { label: "قدِّم للعضوية", href: "/join" } as const;
