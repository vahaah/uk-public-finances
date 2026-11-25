"use client";

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
      <div className="mb-3 flex gap-2" role="group" aria-label="Sort the scorecard">
        <SortButton on={sort === "newest"} onClick={() => setSort("newest")} label="Newest" />
        <SortButton on={sort === "error"} onClick={() => setSort("error")} label="Largest difference" />
      </div>
      <p className="sr-only" aria-live="polite">
        Sorted by {sort === "newest" ? "newest" : "largest difference"}.
      </p>
    </>
  );
}

function SortButton({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" aria-pressed={on} className={`h-9 rounded-full border px-3 text-xs ${on ? "border-neutral-950 font-medium dark:border-white" : "border-neutral-300 dark:border-neutral-700"}`} onClick={onClick}>
      {label}
    </button>
  );
}
