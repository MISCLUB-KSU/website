import { BackgroundPaths } from "@/components/ui/background-paths";

/** صفحة معاينة مؤقّتة — تُحذف بعد الفحص البصري. */
export default function PreviewPaths() {
  return (
    <BackgroundPaths
      title="بين الإدارة والتقنية"
      lede="مجتمع طلابي يحوّل المعرفة إلى خبرة، والأفكار إلى مشاريع."
      action={{ label: "قدِّم للعضوية", href: "/join" }}
    />
  );
}
