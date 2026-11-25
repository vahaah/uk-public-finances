"use client";

import { useEffect, useRef, useState } from "react";

import { PorcupineChart } from "@/components/porcupine-chart";
import type { PorcupineLine } from "@/lib/budgets/porcupine";

type Payload = { lines: PorcupineLine[]; outturn: { fy: string; value: number }[] };

/** Fetches the forecast lines once the section is near the viewport. */
export function LazyPorcupine() {
  const ref = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<Payload | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let cancelled = false;
    const load = () => {
      void fetch("/api/budgets/chart")
        .then((response) => {
          if (!response.ok) throw new Error(String(response.status));
          return response.json() as Promise<Payload>;
        })
        .then((body) => {
          if (!cancelled) setData(body);
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
    };
    if (typeof IntersectionObserver === "undefined") {
      load();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        load();
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(node);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);
  return (
    <div ref={ref} data-chart-slot="" className="min-h-72">
      {failed ? <p className="text-sm">The chart did not load. The year-ahead figures are in the scorecard below.</p> : null}
      {data && data.lines.length > 0 ? <PorcupineChart outturn={data.outturn} vintages={data.lines} /> : null}
      {data && data.lines.length === 0 ? <p className="text-sm">No forecast lines are loaded for this chart.</p> : null}
    </div>
  );
}
