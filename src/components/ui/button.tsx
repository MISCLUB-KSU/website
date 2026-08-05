import type { ReactNode } from "react";

/**
 * الأزرار — حواف حادّة تتبع الشعار.
 * المرور يغيّر اللون فقط: لا يرفع الزر، ولا يضيء حوله، ولا يكبّره.
 */

const BASE =
  "inline-flex min-h-[46px] cursor-pointer items-center justify-center gap-2 " +
  "border-[1.5px] border-transparent px-6 py-3 text-[0.95rem] font-semibold " +
  "transition-colors duration-150 disabled:cursor-not-allowed";

const VARIANTS = {
  primary:
    "bg-primary text-snow hover:bg-deep disabled:bg-sky-100 disabled:text-fg-muted",
  secondary:
    "border-sky bg-transparent text-primary hover:border-primary hover:bg-sky-50 " +
    "disabled:border-sky-100 disabled:text-fg-muted",
  ghost:
    "min-h-[44px] bg-transparent px-2 text-fg-muted hover:text-primary disabled:text-fg-muted/60",
  danger: "bg-danger text-white hover:bg-[#8e1e1a] disabled:bg-sky-100 disabled:text-fg-muted",
} as const;

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  block?: boolean;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  block = false,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`${BASE} ${VARIANTS[variant]} ${block ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * مؤشّر الانشغال — ثلاث ضربات مائلة من الشعار تنبض بالتتابع.
 * الدوّامة الدائرية المعتادة لا تخصّ أحدًا؛ وهذي تخصّ النادي وحده.
 */
export function BusyMark() {
  return (
    <span className="inline-flex items-center gap-[3px]" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <i
          key={i}
          className="mis-pulse block h-3.5 w-1 bg-current"
          style={{ animationDelay: `${i * 0.14}s` }}
        />
      ))}
    </span>
  );
}
