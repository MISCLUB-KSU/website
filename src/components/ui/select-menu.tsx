"use client";

import { MotionConfig, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";

/**
 * قائمةٌ من عندنا تحلّ محلّ قائمة نظام التشغيل.
 *
 * قائمةُ `<select>` الأصليّة **يرسمها macOS لا نحن**: صندوقٌ رماديٌّ لا
 * يقبل لونًا ولا خطًّا ولا حدًّا، ويكسر الوضعَ الداكن والهويةَ معًا. وهذي
 * تُرسم بـ`HTML` فتلبس هويّة النادي.
 *
 * ── القاعدة التي لا تُخالف ────────────────────────────────────────────────
 *
 * ⚠️ **الأصليّةُ تبقى، ولا تُنزع.** هي التي تحمل القيمة وتُرسَل مع النموذج،
 * وهي التي تعمل بلا جافاسكربت. وهذي طبقةٌ **فوقها** لا بديلٌ عنها: تكتب
 * فيها ثم تُطلق حدثًا حقيقيًّا، فيصل الخبرُ إلى React ومنه إلى النموذج
 * كأنّ الطالب اختار بيده. ولذلك تُركّب بعد التحميل وحده — فمن لا جافاسكربت
 * عنده يرى القائمة الأصليّة كاملةً تعمل.
 *
 * ⚠️ **الكتابةُ بمُحدِّث المتصفّح لا بـ`el.value`.** React يحفظ آخر قيمةٍ
 * يعرفها على العنصر، فالإسنادُ المباشر يغيّر الشاشة ولا يوقظه — ثم يُعيد
 * الحقلَ إلى قيمته القديمة عند أوّل رسمٍ تالٍ. المُحدِّثُ الأصليّ يتخطّى
 * هذا الحفظ، والحدثُ بعده يُبلِّغ.
 */

export type MenuOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type MenuGroup = {
  label: string;
  options: readonly MenuOption[];
};

type SelectMenuProps = {
  /** القائمة الأصليّة — مصدر القيمة ووجهة الكتابة */
  nativeRef: React.RefObject<HTMLSelectElement | null>;
  placeholder: string;
  groups: readonly MenuGroup[];
  /** ما هو مختارٌ الآن — يأتي من الأصليّة لا من حالةٍ موازية */
  value: string;
  onPick: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  /** معرّف التسمية الظاهرة فوق الحقل */
  labelId: string;
};

/** كل الخيارات في صفٍّ واحد — للتنقّل بالسهم وللبحث بالحرف */
function flatten(groups: readonly MenuGroup[]): MenuOption[] {
  return groups.flatMap((group) => group.options.filter((o) => !o.disabled));
}

export function SelectMenu({
  nativeRef,
  placeholder,
  groups,
  value,
  onPick,
  invalid,
  disabled,
  labelId,
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  /**
   * ⚠️ **التركيز يُنقل صراحةً — `autoFocus` لا يكفي.**
   *
   * قِيس فوجد أن التركيز يبقى على الزرّ بعد الفتح، فتذهب أسهمُ التنقّل إلى
   * مستمعِ الزرّ فتُعيد الفتح من أوّله بدل أن تتنقّل — يعلق من لا فأرة معه
   * في أوّل خيار. و`autoFocus` سمةُ حقولٍ لا تُنفَّذ على `ul` هنا.
   */
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  /** الإغلاق مع إرجاع التركيز إلى الزرّ — إلّا حين يُغلق بنقرةٍ خارجه */
  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  const flat = flatten(groups);
  const current = flat.find((o) => o.value === value);

  /* البحث بالحرف — سلوكُ القائمة الأصليّة نفسه، يفقده من يبني قائمته
     ثم يتركها للفأرة وحدها. المهلة تُصفّر بعد ثلث ثانيةٍ من السكون. */
  const typed = useRef({ text: "", at: 0 });

  function commit(option: MenuOption) {
    const element = nativeRef.current;
    if (element) {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        "value",
      )?.set;
      setter?.call(element, option.value);
      element.dispatchEvent(new Event("change", { bubbles: true }));
      element.dispatchEvent(new Event("input", { bubbles: true }));
    }
    onPick(option.value);
    close();
  }

  /* الإغلاق بالنقر خارجها — ولمسةً كانت أو ضغطة */
  useEffect(() => {
    if (!open) return;
    function onDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  /* الصفُّ النشط يُجلب إلى المرأى — وإلّا تحرّك التحديد خارج الصندوق صامتًا */
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelectorAll<HTMLElement>('[role="option"]')
      [active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function openAt(index: number) {
    setActive(Math.max(0, index));
    setOpen(true);
  }

  function onTriggerKey(event: React.KeyboardEvent) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      openAt(flat.findIndex((o) => o.value === value));
    }
  }

  function onListKey(event: React.KeyboardEvent) {
    const last = flat.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((i) => (i >= last ? 0 : i + 1));
        return;
      case "ArrowUp":
        event.preventDefault();
        setActive((i) => (i <= 0 ? last : i - 1));
        return;
      case "Home":
        event.preventDefault();
        setActive(0);
        return;
      case "End":
        event.preventDefault();
        setActive(last);
        return;
      case "Escape":
        event.preventDefault();
        close();
        return;
      case "Tab":
        /* بلا إرجاعِ تركيزٍ ولا منعٍ للسلوك: `Tab` يُكمل إلى الحقل التالي،
           وإرجاعُه إلى الزرّ يحبس المتنقّل في القائمة نفسها. */
        setOpen(false);
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        if (flat[active]) commit(flat[active]);
        return;
    }

    if (event.key.length === 1) {
      const now = Date.now();
      typed.current.text =
        now - typed.current.at > 350
          ? event.key
          : typed.current.text + event.key;
      typed.current.at = now;
      const found = flat.findIndex((o) =>
        o.label.trim().startsWith(typed.current.text),
      );
      if (found >= 0) setActive(found);
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div ref={rootRef} className="relative">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-labelledby={labelId}
          onClick={() =>
            open
              ? setOpen(false)
              : openAt(flat.findIndex((o) => o.value === value))
          }
          onKeyDown={onTriggerKey}
          className={`bg-bg-raised text-fg flex min-h-[46px] w-full items-center justify-between gap-s3 border-[1.5px] px-3.5 py-3 text-start text-[0.95rem] transition-colors duration-150 disabled:cursor-not-allowed ${
            invalid
              ? "border-danger"
              : open
                ? "border-accent"
                : "border-line-field hover:border-sky"
          }`}
        >
          {/* النائب بلا شفافية — انظر `field.tsx`: `/70` تنزل به تحت 4.5:1 */}
          <span className={current ? "text-fg" : "text-fg-muted"}>
            {current?.label ?? placeholder}
          </span>
          {/* السهم يدور مع الفتح — علامةُ حالةٍ لا زخرفة */}
          <svg
            viewBox="0 0 20 20"
            width="14"
            height="14"
            fill="none"
            aria-hidden="true"
            className={`text-fg-muted shrink-0 transition-transform duration-200 ${open ? "-rotate-180" : ""}`}
          >
            <path
              d="M4 7l6 6 6-6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="square"
            />
          </svg>
        </button>

        {open && (
          <motion.ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-labelledby={labelId}
            tabIndex={-1}
            onKeyDown={onListKey}
            initial={{ y: -4 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
            /* ⚠️ **حدٌّ قويٌّ لا ظلّ.** القائمة تطفو فوق حقولٍ أرضيّتها
               أرضيّتُها نفسها، فلا بدّ ممّا يفصلها — والظلُّ الواسع أشهرُ
               علامات الصنعة الآليّة. `--line-control` يعطي 3:1 على السطح
               في الوضعين، فيفصل بالحدّ لا بالهالة. */
            className="border-line-control bg-bg-raised absolute inset-x-0 top-[calc(100%+4px)] z-20 max-h-72 overflow-auto border-[1.5px] py-1 outline-none"
          >
            {groups.map((group) => (
              <li key={group.label || "__flat"}>
                {group.label && (
                  <p className="text-fg-muted px-3.5 pt-3 pb-1.5 text-[0.72rem] font-semibold">
                    {group.label}
                  </p>
                )}
                <ul role="group" aria-label={group.label || undefined}>
                  {group.options.map((option) => {
                    const index = flat.indexOf(option);
                    const isActive = index === active && index >= 0;
                    const isPicked = option.value === value;
                    return (
                      <li
                        key={option.value}
                        role="option"
                        aria-selected={isPicked}
                        aria-disabled={option.disabled || undefined}
                        onPointerEnter={() => index >= 0 && setActive(index)}
                        onClick={() => !option.disabled && commit(option)}
                        className={`flex min-h-11 cursor-pointer items-center gap-s3 px-3.5 text-[0.92rem] ${
                          option.disabled
                            ? "text-fg-muted/60 cursor-not-allowed"
                            : isActive
                              ? "bg-bg-sunken text-fg"
                              : "text-fg"
                        } ${isPicked ? "font-semibold" : ""}`}
                      >
                        {/* ⚠️ **علامةُ الاختيار ميلانُ الشعار لا صحٌّ عامّ.**
                            الصحُّ يصلح لأي منتجٍ في الدنيا، وهذا الشكل يخصّ
                            النادي وحده. وهو الموضع الثالث والأخير للميلان في
                            هذي الشاشة (الشارة · قصُّ البطاقة · هذا)، ويظهر
                            وقتَ فتح القائمة فقط. */}
                        <i
                          aria-hidden
                          className={`block h-3.5 w-[3px] shrink-0 ${isPicked ? "bg-accent" : "bg-transparent"}`}
                          style={{ transform: "skewX(-20deg)" }}
                        />
                        {option.label}
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </motion.ul>
        )}
      </div>
    </MotionConfig>
  );
}
