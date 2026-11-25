import { eventLabel, type FiscalEvent } from "@/lib/budgets/events";
import { withoutPartYear } from "@/lib/budgets/compare";

export type PorcupineLine = {
  id: string;
  name: string;
  highlight: boolean;
  points: { fy: string; value: number }[];
};

type Vintage = { date: string; precision: "day" | "month"; series: string; points: { fy: string; value: number }[] };

/** One line per fiscal event. Names are kept only for the latest line, which is the one the chart labels. */
export function porcupineLines(events: Pick<FiscalEvent, "date" | "slug" | "name" | "shortName" | "obrForecast">[], vintages: Vintage[]): PorcupineLine[] {
  const psnb = vintages.filter((vintage) => vintage.series === "psnb");
  const matched = events.flatMap((event) => {
    if (event.obrForecast === "no") return [];
    const vintage = psnb.find((item) =>
      item.precision === "month" ? event.date.slice(0, 7) === item.date.slice(0, 7) : Math.abs(Date.parse(event.date) - Date.parse(item.date)) <= 7 * 86400000,
    );
    if (!vintage) return [];
    return [{ id: event.slug, name: eventLabel(event), highlight: false, points: withoutPartYear(event.date, vintage.points).map((point) => ({ fy: point.fy, value: Number(point.value.toFixed(1)) })) }];
  });
  const last = matched.at(-1);
  if (last) last.highlight = true;
  for (const line of matched) {
    if (!line.highlight) line.name = "";
  }
  return matched;
}
