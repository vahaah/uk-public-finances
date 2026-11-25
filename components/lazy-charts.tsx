"use client";

import dynamic from "next/dynamic";

function ChartSlot() {
  return <div className="h-64" data-chart-slot="" />;
}

export const BorrowingChart = dynamic(() => import("@/components/charts").then((mod) => mod.BorrowingChart), { ssr: false, loading: ChartSlot });
export const CumulativeChart = dynamic(() => import("@/components/charts").then((mod) => mod.CumulativeChart), { ssr: false, loading: ChartSlot });
export const HistoryChart = dynamic(() => import("@/components/charts").then((mod) => mod.HistoryChart), { ssr: false, loading: ChartSlot });
export const ReceiptsChart = dynamic(() => import("@/components/charts").then((mod) => mod.ReceiptsChart), { ssr: false, loading: ChartSlot });
export const SpendingVisuals = dynamic(() => import("@/components/charts").then((mod) => mod.SpendingVisuals), { ssr: false, loading: ChartSlot });
export const DepartmentChart = dynamic(() => import("@/components/charts").then((mod) => mod.DepartmentChart), { ssr: false, loading: ChartSlot });
export const YieldChart = dynamic(() => import("@/components/charts").then((mod) => mod.YieldChart), { ssr: false, loading: ChartSlot });
export const DebtRatioChart = dynamic(() => import("@/components/charts").then((mod) => mod.DebtRatioChart), { ssr: false, loading: ChartSlot });

export const CompareBars = dynamic(() => import("@/components/story-charts").then((mod) => mod.CompareBars), { ssr: false, loading: ChartSlot });
export const LongRunLine = dynamic(() => import("@/components/story-charts").then((mod) => mod.LongRunLine), { ssr: false, loading: ChartSlot });
export const MultiLine = dynamic(() => import("@/components/story-charts").then((mod) => mod.MultiLine), { ssr: false, loading: ChartSlot });
export const RangeCompare = dynamic(() => import("@/components/story-charts").then((mod) => mod.RangeCompare), { ssr: false, loading: ChartSlot });
export const SignedBars = dynamic(() => import("@/components/story-charts").then((mod) => mod.SignedBars), { ssr: false, loading: ChartSlot });
export const StackedBars = dynamic(() => import("@/components/story-charts").then((mod) => mod.StackedBars), { ssr: false, loading: ChartSlot });
export const VintagesLine = dynamic(() => import("@/components/story-charts").then((mod) => mod.VintagesLine), { ssr: false, loading: ChartSlot });

export const ForecastTrackChart = dynamic(() => import("@/components/forecast-track").then((mod) => mod.ForecastTrackChart), { ssr: false, loading: ChartSlot });
export const SmallSeriesChart = dynamic(() => import("@/components/forecast-track").then((mod) => mod.SmallSeriesChart), { ssr: false, loading: ChartSlot });

export const ReceiptMixChart = dynamic(() => import("@/components/mix-chart").then((mod) => mod.ReceiptMixChart), { ssr: false, loading: ChartSlot });
export const FunctionMixChart = dynamic(() => import("@/components/mix-chart").then((mod) => mod.FunctionMixChart), { ssr: false, loading: ChartSlot });

export const PorcupineChart = dynamic(() => import("@/components/porcupine-chart").then((mod) => mod.PorcupineChart), { ssr: false, loading: ChartSlot });
