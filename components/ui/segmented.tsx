"use client";

import { SegmentedControl, SegmentedControlItem } from "@ui-sdk/react/segmented-control";

/** One-of-n control. Arrow keys move the choice; the selected item is a radio. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className = "",
  itemClassName = "",
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <SegmentedControl
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as T);
      }}
      className={`inline-flex max-w-full flex-wrap rounded-md border border-neutral-300 p-0.5 dark:border-neutral-700 ${className}`}
    >
      {options.map((option) => (
        <SegmentedControlItem
          key={option.value}
          value={option.value}
          className={(state) =>
            `inline-flex h-11 min-w-11 items-center justify-center px-2.5 text-xs sm:h-7 ${itemClassName} ${state.checked ? "bg-neutral-100 font-medium text-neutral-950 dark:bg-neutral-800 dark:text-white" : "text-neutral-800 dark:text-neutral-200"}`
          }
        >
          {option.label}
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  );
}
