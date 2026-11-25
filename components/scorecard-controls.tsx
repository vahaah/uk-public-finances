"use client";

import { Toggle, ToggleGroup } from "@ui-sdk/react/toggle";
import { useEffect, useState } from "react";

/** Reorders the server-rendered scorecard. The row figures stay in the HTML and are not sent again as props. */
export function ScorecardControls() {
  const [sort, setSort] = useState<"newest" | "error">("newest");
  useEffect(() => {
    const body = document.getElementById("scorecard-body");
    if (!body) return;
    const rows = [...body.querySelectorAll(":scope > tr")];
    rows.sort((left, right) => {
      if (sort === "newest") return (right.getAttribute("data-date") ?? "").localeCompare(left.getAttribute("data-date") ?? "");
      return Number(right.getAttribute("data-diff") ?? -1) - Number(left.getAttribute("data-diff") ?? -1);
    });
    for (const row of rows) body.appendChild(row);
  }, [sort]);
  return (
    <>
      <ToggleGroup
        aria-label="Sort the scorecard"
        deselectable={false}
        value={[sort]}
        onValueChange={(next) => {
          const picked = next.find((item) => item !== sort) ?? next[0];
          if (picked === "newest" || picked === "error") setSort(picked);
        }}
        className="mb-3 flex gap-2"
      >
        <SortToggle value="newest" label="Newest" />
        <SortToggle value="error" label="Largest difference" />
      </ToggleGroup>
      <p className="sr-only" aria-live="polite">
        Sorted by {sort === "newest" ? "newest" : "largest difference"}.
      </p>
    </>
  );
}

function SortToggle({ value, label }: { value: "newest" | "error"; label: string }) {
  return (
    <Toggle
      value={value}
      className={(state) =>
        `inline-flex h-11 items-center rounded-full border px-3 text-xs sm:h-9 ${state.pressed ? "border-neutral-950 font-medium dark:border-white" : "border-neutral-300 dark:border-neutral-700"}`
      }
    >
      {label}
    </Toggle>
  );
}
