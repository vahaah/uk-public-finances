"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui-sdk/react/select";

/** A labelled list that opens on click and finds an option as you type. */
export function ChoiceSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Choose",
  stacked = false,
}: {
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  placeholder?: string;
  stacked?: boolean;
}) {
  return (
    <div className={stacked ? "text-sm" : "inline-flex items-center gap-1 text-xs text-neutral-800 dark:text-neutral-200"}>
      <span className={stacked ? "" : "sr-only"}>{label}</span>
      {!stacked ? <span aria-hidden="true">{label}</span> : null}
      <Select
        value={value ?? undefined}
        onValueChange={(next) => {
          if (typeof next === "string" && next) onChange(next);
        }}
      >
        <SelectTrigger
          aria-label={label}
          className={`inline-flex items-center justify-between gap-2 rounded-md border border-neutral-300 bg-white px-2 text-left text-neutral-950 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50 ${stacked ? "mt-1 h-11 w-full text-sm sm:h-9" : "h-11 min-w-24 text-xs sm:h-8"}`}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="z-30 max-h-64 overflow-y-auto border border-neutral-200 bg-white py-1 text-sm shadow-lg dark:border-neutral-800 dark:bg-black">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              label={option.label}
              className={(state) => `px-3 py-2 ${state.highlighted ? "bg-neutral-100 dark:bg-neutral-900" : ""} ${state.selected ? "font-medium" : ""}`}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
