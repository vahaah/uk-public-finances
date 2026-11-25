"use client";

import dynamic from "next/dynamic";

const LazyPorcupine = dynamic(() => import("@/components/lazy-porcupine").then((mod) => mod.LazyPorcupine), {
  ssr: false,
  loading: () => <div className="h-72" data-chart-slot="" />,
});

export function BudgetsChart() {
  return <LazyPorcupine />;
}
