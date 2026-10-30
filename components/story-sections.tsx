import { StoryFigure } from "@/components/story-figure";
import { CompareBars, LongRunLine, RangeCompare, SignedBars, StackedBars, VintagesLine } from "@/components/story-charts";
import { formatUnit } from "@/lib/story-format";
import type { RhdiDecade } from "@/lib/rhdi-decades";
import { financialYearOf } from "@/lib/budgets/events";
import { efoSourceTitle, OBR_SOURCE, SERIES_META, type EfoData, type EventCompare } from "@/lib/story";

type Props = { efo: EfoData; path: string };

const src = (efo: EfoData, extra?: string) => ({ ...OBR_SOURCE, title: extra ?? efoSourceTitle(efo), releaseDate: efo.eventDate });
const forecastFrom = (efo: EfoData) => (efo.eventDate ? financialYearOf(efo.eventDate) : null);
const dir = (current: number | null | undefined, previous: number | null | undefined) => (current == null || previous == null || current === previous ? null : current > previous ? 1 : -1);
const round1 = (value: number) => Math.round(value * 10) / 10;
const at = (points: { period: string; current: number | null; previous: number | null }[], period: string) => points.find((point) => point.period === period);

function compareCsv(points: { period: string; current: number | null; previous: number | null }[], current: string, previous: string) {
  return { header: ["period", `${previous} forecast`, `${current} forecast`], rows: points.map((point) => [point.period, point.previous, point.current]) };
}

/** Biggest gap between the two forecasts, in words. */
function biggestRevision(points: { period: string; current: number | null; previous: number | null }[]) {
  return points
    .filter((point) => point.current != null && point.previous != null)
    .sort((a, b) => Math.abs((b.current ?? 0) - (b.previous ?? 0)) - Math.abs((a.current ?? 0) - (a.previous ?? 0)))[0];
}

export function CompareFigure({ compare, path, id, title, takeaway, sourceTitle, releaseDate }: { compare: EventCompare; path: string; id: string; title?: string; takeaway?: string; sourceTitle: string; releaseDate: string | null }) {
  const meta = SERIES_META[compare.series];
  const big = biggestRevision(compare.points);
  const words =
    takeaway ??
    (big
      ? `${meta.short} for ${big.period}: ${formatUnit(big.current, meta.unit)} in the ${compare.currentLabel} forecast, against ${formatUnit(big.previous, meta.unit)} in ${compare.previousLabel}.`
      : `${meta.title}, ${compare.previousLabel} against ${compare.currentLabel}.`);
  return (
    <StoryFigure
      id={id}
      path={path}
      title={title ?? `${meta.title}: ${compare.previousLabel} forecast against ${compare.currentLabel}`}
      subtitle={meta.unit === "bn" ? "£ billion, by financial year." : meta.unit === "pctGdp" ? "Per cent of GDP, by financial year." : "Per cent, by calendar year."}
      takeaway={words}
      csv={compareCsv(compare.points, compare.currentLabel, compare.previousLabel)}
      source={{ ...OBR_SOURCE, title: sourceTitle, releaseDate }}
    >
      <CompareBars points={compare.points} currentLabel={compare.currentLabel} previousLabel={compare.previousLabel} unit={meta.unit} />
    </StoryFigure>
  );
}

export function GdpFigure({ efo, path }: Props) {
  if (!efo.gdp) return null;
  const points = efo.gdp.points.filter((point) => point.previous != null || Number(point.period) >= Number(efo.eventDate?.slice(0, 4) ?? 0)).filter((point) => Number(point.period) >= Number(efo.eventDate?.slice(0, 4) ?? 0));
  const next = at(points, String(Number(efo.eventDate?.slice(0, 4) ?? 0) + 1));
  return (
    <StoryFigure
      id="gdp"
      path={path}
      title={next && dir(next.current, next.previous) === -1 ? `Growth forecast cut for ${next.period}` : next && dir(next.current, next.previous) === 1 ? `Growth forecast raised for ${next.period}` : next && next.current != null && next.previous != null ? `Growth forecast for ${next.period} unchanged` : "Real GDP growth forecasts compared"}
      subtitle="Real GDP growth, per cent, by calendar year."
      takeaway={next ? `The OBR now expects the economy to grow ${formatUnit(next.current, "pct")} in ${next.period}, ${dir(next.current, next.previous) === 1 ? "up" : dir(next.current, next.previous) === -1 ? "down" : "unchanged"} from ${formatUnit(next.previous, "pct")} in its ${efo.gdp.previousLabel} forecast.` : "Real GDP growth forecasts compared."}
      csv={compareCsv(points, efo.gdp.currentLabel, efo.gdp.previousLabel)}
      source={src(efo)}
    >
      <CompareBars points={points} currentLabel={efo.gdp.currentLabel} previousLabel={efo.gdp.previousLabel} unit="pct" highlight={next?.period} />
    </StoryFigure>
  );
}

export function CpiFigure({ efo, path }: Props) {
  if (!efo.cpi) return null;
  const year = Number(efo.eventDate?.slice(0, 4) ?? 0);
  const points = efo.cpi.points.filter((point) => Number(point.period) >= year);
  const next = at(points, String(year + 1));
  const after = at(points, String(year + 2));
  const cpiTitle =
    next && dir(next.current, next.previous) === 1 && after && dir(after.current, after.previous) === 1
      ? "Inflation forecast higher for the next two years"
      : next && dir(next.current, next.previous) === 1
        ? `Inflation forecast raised for ${next.period}`
        : next
          ? `CPI inflation forecast for ${next.period}`
          : "CPI inflation forecasts compared";
  return (
    <StoryFigure
      id="cpi"
      path={path}
      title={cpiTitle}
      subtitle="CPI inflation, per cent, by calendar year."
      takeaway={next ? `CPI inflation is forecast at ${formatUnit(next.current, "pct")} in ${next.period}, ${dir(next.current, next.previous) === -1 ? "down" : dir(next.current, next.previous) === 1 ? "up" : "unchanged"} from ${formatUnit(next.previous, "pct")} in the ${efo.cpi.previousLabel} forecast.` : "CPI inflation forecasts compared."}
      csv={compareCsv(points, efo.cpi.currentLabel, efo.cpi.previousLabel)}
      source={src(efo)}
    >
      <CompareBars points={points} currentLabel={efo.cpi.currentLabel} previousLabel={efo.cpi.previousLabel} unit="pct" highlight={next?.period} />
    </StoryFigure>
  );
}

export function RhdiGrowthFigure({ efo, path }: Props) {
  if (!efo.rhdiGrowth) return null;
  const from = forecastFrom(efo) ?? "";
  const points = efo.rhdiGrowth.points.filter((point) => point.period >= from);
  const first = points[0];
  return (
    <StoryFigure
      id="incomes"
      path={path}
      title={first?.current == null ? "Real income per person forecasts compared" : first.current < 0 ? `Real income per person forecast to fall in ${first.period}` : `Real income per person forecast to grow ${formatUnit(first.current, "pct")} in ${first.period}`}
      subtitle="Growth in real household disposable income per person, per cent, by financial year."
      takeaway={first ? `Real household disposable income per person is forecast to change by ${formatUnit(first.current, "pct")} in ${first.period}, against ${formatUnit(first.previous, "pct")} in the ${efo.rhdiGrowth.previousLabel} forecast.` : "Household income forecasts compared."}
      csv={compareCsv(points, efo.rhdiGrowth.currentLabel, efo.rhdiGrowth.previousLabel)}
      source={src(efo)}
    >
      <CompareBars points={points} currentLabel={efo.rhdiGrowth.currentLabel} previousLabel={efo.rhdiGrowth.previousLabel} unit="pct" highlight={first?.period} />
    </StoryFigure>
  );
}

export function RhdiRollingFigure({ efo, path }: Props) {
  if (efo.rhdiRolling.length < 2) return null;
  const from = forecastFrom(efo);
  const first = efo.rhdiRolling[0]!;
  const now = efo.rhdiRolling.find((point) => point.period === from) ?? efo.rhdiRolling.at(-1)!;
  return (
    <StoryFigure
      id="income-growth-long-run"
      path={path}
      title={now.value <= Math.min(...efo.rhdiRolling.map((point) => point.value)) ? "Slowest ten years of income growth since the series began" : "Ten-year growth in household income per person"}
      subtitle="Rolling 10-year average growth in real household disposable income per person, per cent."
      takeaway={`Over the ten years to ${now.period}, real household income per person grew by an average of ${formatUnit(now.value, "pct")} a year. The series starts with the ten years to ${first.period}, at ${formatUnit(first.value, "pct")} a year.`}
      csv={{ header: ["period", "rolling 10-year average growth, %"], rows: efo.rhdiRolling.map((point) => [point.period, point.value]) }}
      source={src(efo)}
    >
      <LongRunLine points={efo.rhdiRolling} unit="pct" name="10-year average growth" forecastFrom={from} />
    </StoryFigure>
  );
}

export function PsnbFigure({ efo, path }: Props) {
  if (!efo.psnb) return null;
  const from = forecastFrom(efo) ?? "";
  const first = at(efo.psnb.points, from);
  const both = efo.psnb.points.filter((point) => point.current != null && point.previous != null);
  const higher = both.filter((point) => dir(point.current, point.previous) === 1).length;
  const psnbTitle =
    both.length && higher === both.length
      ? `Borrowing forecast higher in every year than in ${efo.psnb.previousLabel}`
      : higher > 0
        ? `Borrowing forecast higher in ${higher} of ${both.length} years`
        : `Borrowing forecast against ${efo.psnb.previousLabel}`;
  return (
    <StoryFigure
      id="borrowing"
      path={path}
      title={psnbTitle}
      subtitle="Public sector net borrowing, £ billion, by financial year."
      takeaway={first ? `Borrowing in ${from} is now forecast at ${formatUnit(first.current, "bn")}, ${dir(first.current, first.previous) === -1 ? "down" : dir(first.current, first.previous) === 1 ? "up" : "unchanged"} from ${formatUnit(first.previous, "bn")} in the ${efo.psnb.previousLabel} forecast.` : "Borrowing forecasts compared."}
      csv={compareCsv(efo.psnb.points, efo.psnb.currentLabel, efo.psnb.previousLabel)}
      source={src(efo)}
    >
      <CompareBars points={efo.psnb.points} currentLabel={efo.psnb.currentLabel} previousLabel={efo.psnb.previousLabel} unit="bn" highlight={first?.period} />
    </StoryFigure>
  );
}

export function DebtInterestFigure({ efo, path }: Props) {
  if (!efo.debtInterest) return null;
  const from = forecastFrom(efo);
  const line = efo.debtInterest.points.flatMap((point) => (point.current == null ? [] : [{ period: point.period, value: point.current }]));
  const previous = efo.debtInterest.points.flatMap((point) => (point.previous == null ? [] : [{ period: point.period, value: point.previous }]));
  const peakPast = line.filter((point) => !from || point.period < from).sort((a, b) => b.value - a.value)[0];
  const end = line.at(-1);
  return (
    <StoryFigure
      id="debt-interest"
      path={path}
      title={
        end && peakPast && round1(end.value) > round1(peakPast.value)
          ? "Debt interest forecast to reach a new high"
          : end && peakPast && round1(end.value) === round1(peakPast.value)
            ? `Debt interest forecast to match its ${peakPast.period} high`
            : line[0]
              ? `Debt interest as a share of GDP since ${line[0].period}`
              : "Debt interest as a share of GDP"
      }
      subtitle={`Debt interest spending, per cent of GDP, outturn and ${efo.debtInterest.currentLabel} forecast, with the ${efo.debtInterest.previousLabel} forecast.`}
      takeaway={end && peakPast ? `Debt interest is forecast at ${formatUnit(end.value, "pctGdp")} in ${end.period}. The highest year so far was ${peakPast.period}, at ${formatUnit(peakPast.value, "pctGdp")}.` : "Debt interest as a share of GDP."}
      csv={{ header: ["period", `${efo.debtInterest.currentLabel} (outturn and forecast), % GDP`, `${efo.debtInterest.previousLabel} forecast, % GDP`], rows: efo.debtInterest.points.map((point) => [point.period, point.current, point.previous]) }}
      source={src(efo)}
    >
      <LongRunLine points={line} unit="pctGdp" name="Debt interest" forecastFrom={from} previous={previous} previousName={`${efo.debtInterest.previousLabel} forecast`} />
    </StoryFigure>
  );
}

export function PolicyFigure({ efo, path }: Props) {
  const points = efo.policy.flatMap((point) => (point.total == null ? [] : [{ period: point.period, value: point.total }]));
  if (points.length < 2) return null;
  const first = points[0]!;
  const last = points.at(-1)!;
  return (
    <StoryFigure
      id="policy-by-year"
      path={path}
      title={first.value > 0 && last.value < 0 ? "Decisions add to borrowing at first, then reduce it" : points.every((point) => point.value > 0) ? "Decisions add to borrowing in every year" : points.every((point) => point.value < 0) ? "Decisions reduce borrowing in every year" : "Effect of the decisions on borrowing"}
      subtitle="Direct effect of this event's policy decisions on borrowing, £ billion. Above zero adds to borrowing; below zero reduces it."
      takeaway={`The decisions add ${formatUnit(first.value, "bn")} to borrowing in ${first.period} and reduce it by ${formatUnit(Math.abs(last.value), "bn")} in ${last.period}.`}
      csv={{ header: ["period", "total £bn", "current spending £bn", "capital spending £bn", "receipts £bn"], rows: efo.policy.map((point) => [point.period, point.total, point.currentSpending, point.capitalSpending, point.receipts]) }}
      source={src(efo)}
    >
      <SignedBars points={points} unit="bn" name="Effect on borrowing" positiveLabel="Adds to borrowing" negativeLabel="Reduces borrowing" />
    </StoryFigure>
  );
}

export function TaxBurdenFigure({ efo, path }: Props) {
  if (!efo.taxBurden) return null;
  const from = forecastFrom(efo);
  const outturn = efo.taxBurden.outturn;
  const forecast = efo.taxBurden.points.flatMap((point) => (point.current == null ? [] : [{ period: point.period, value: point.current }]));
  const merged = [...outturn, ...forecast.filter((point) => !outturn.some((past) => past.period === point.period))];
  const previous = efo.taxBurden.points.flatMap((point) => (point.previous == null ? [] : [{ period: point.period, value: point.previous }]));
  const peakPast = [...outturn].sort((a, b) => b.value - a.value)[0];
  const end = forecast.at(-1);
  const firstForecast = forecast[0]?.period ?? from;
  return (
    <StoryFigure
      id="tax-burden"
      path={path}
      title={end && peakPast && end.value > peakPast.value ? "The tax burden rises to a record high" : "The tax burden over the long run"}
      subtitle="National Accounts taxes, per cent of GDP, outturn since 1948-49 and forecast."
      takeaway={end && peakPast ? `Taxes are forecast to reach ${formatUnit(end.value, "pctGdp")} by ${end.period}. The highest year so far was ${peakPast.period}, at ${formatUnit(peakPast.value, "pctGdp")}. The series starts in 1948-49.` : "The tax burden over time."}
      csv={{ header: ["period", "outturn % GDP", `${efo.taxBurden.currentLabel} forecast % GDP`, `${efo.taxBurden.previousLabel} forecast % GDP`], rows: [...new Set([...outturn.map((p) => p.period), ...efo.taxBurden.points.map((p) => p.period)])].sort().map((period) => [period, outturn.find((p) => p.period === period)?.value ?? null, forecast.find((p) => p.period === period)?.value ?? null, previous.find((p) => p.period === period)?.value ?? null]) }}
      source={src(efo)}
    >
      <LongRunLine points={merged} unit="pctGdp" name="Taxes" forecastFrom={firstForecast} previous={previous} previousName={`${efo.taxBurden.previousLabel} forecast`} />
    </StoryFigure>
  );
}

export function PsnflFigure({ efo, path }: Props) {
  if (!efo.psnfl) return null;
  // Years with no figure in this forecast (e.g. a year with only an earlier forecast) are left out rather than drawn half-empty.
  const shown = efo.psnfl.points.filter((point) => point.current != null);
  const dropped = efo.psnfl.points.filter((point) => point.current == null).map((point) => point.period);
  const peak = efo.psnfl.points.filter((point) => point.current != null).sort((a, b) => (b.current ?? 0) - (a.current ?? 0))[0];
  const end = efo.psnfl.points.filter((point) => point.current != null).at(-1);
  const peaksThenFalls = peak && end && peak.period < end.period && (end.current ?? 0) < (peak.current ?? 0);
  return (
    <StoryFigure
      id="debt"
      path={path}
      title={peaksThenFalls ? `Debt forecast to peak in ${peak.period}, then fall` : "Net financial liabilities forecast"}
      subtitle="Public sector net financial liabilities, per cent of GDP, by financial year."
      takeaway={peak && end ? peaksThenFalls ? `Net financial liabilities are forecast to peak at ${formatUnit(peak.current, "pctGdp")} in ${peak.period} and to be ${formatUnit(end.current, "pctGdp")} by ${end.period}.` : `Net financial liabilities are forecast to be ${formatUnit(end.current, "pctGdp")} by ${end.period}.` : "Debt forecasts compared."}
      csv={compareCsv(efo.psnfl.points, efo.psnfl.currentLabel, efo.psnfl.previousLabel)}
      source={src(efo)}
    >
      <CompareBars points={shown} currentLabel={efo.psnfl.currentLabel} previousLabel={efo.psnfl.previousLabel} unit="pctGdp" highlight={peaksThenFalls ? peak.period : undefined} />
      {dropped.length ? <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-300">Not shown: {dropped.join(", ")}, which has no {efo.psnfl.currentLabel} figure in this OBR table.</p> : null}
    </StoryFigure>
  );
}

export function DebtVsOutturnFigure({ efo, path }: Props) {
  const data = efo.debtVsOutturn;
  if (!data || data.points.length < 2) return null;
  const lastOut = data.points.filter((point) => point.outturn != null).at(-1);
  const firstVintage = data.vintages[0];
  const firstForecast = lastOut?.values[0];
  const gap = lastOut?.outturn != null && firstForecast != null ? lastOut.outturn - firstForecast : null;
  return (
    <StoryFigure
      id="debt-forecasts-vs-outturn"
      path={path}
      title={gap != null && gap !== 0 && firstVintage ? `Debt came in ${gap < 0 ? "below" : "above"} the ${firstVintage} forecast` : "Debt forecasts and what happened"}
      subtitle="Debt as a share of GDP: past OBR forecasts against the outturn, as shown in the OBR Forecast evaluation report."
      takeaway={lastOut && firstVintage ? `For ${lastOut.period}, debt was ${formatUnit(lastOut.outturn, "pctGdp")} of GDP. The ${firstVintage} forecast was ${formatUnit(firstForecast, "pctGdp")}${gap != null && gap !== 0 ? `, an ${gap < 0 ? "over" : "under"}-forecast of ${Math.abs(gap).toFixed(1)} percentage points` : ""}.` : "Past debt forecasts against outturn."}
      csv={{ header: ["period", ...data.vintages.map((vintage) => `${vintage} forecast`), "outturn"], rows: data.points.map((point) => [point.period, ...point.values, point.outturn]) }}
      source={{ ...OBR_SOURCE, title: "Forecast evaluation report: charts and tables, chart 'Debt as a share of GDP'", releaseDate: null }}
    >
      <VintagesLine vintages={data.vintages} points={data.points} unit="pctGdp" />
    </StoryFigure>
  );
}

export function PackagesFigure({ efo, path }: Props) {
  if (efo.packages.length < 2) return null;
  const points = efo.packages.map((item) => ({ period: item.event, value: item.pctGdp }));
  const latest = points.at(-1)!;
  return (
    <StoryFigure
      id="package-size"
      path={path}
      title="How big each fiscal event was"
      subtitle="Change to borrowing from policy decisions, per cent of GDP, summed over five years. Above zero adds to borrowing."
      takeaway={`The ${latest.period} decisions changed borrowing by ${formatUnit(latest.value, "pctGdp")} over five years, as measured by the OBR.`}
      csv={{ header: ["event", "% of GDP over 5 years"], rows: points.map((point) => [point.period, point.value]) }}
      source={src(efo)}
    >
      <SignedBars points={points} unit="pctGdp" name="Policy package" positiveLabel="Adds to borrowing" negativeLabel="Reduces borrowing" />
    </StoryFigure>
  );
}

export function MeasuresFigure({ rows, path, releaseDate }: { rows: { name: string; date: string; count: number; averageBn: number | null }[]; path: string; releaseDate: string | null }) {
  const recent = rows.filter((row) => row.date >= "2010-01-01");
  if (recent.length < 2) return null;
  const top = [...recent].sort((a, b) => b.count - a.count)[0]!;
  const latest = recent.at(-1)!;
  const counts = recent.map((row) => ({ period: row.date.slice(0, 7), value: row.count, label: row.name }));
  const sizes = recent.flatMap((row) => (row.averageBn == null ? [] : [{ period: row.date.slice(0, 7), value: row.averageBn, label: row.name }]));
  return (
    <StoryFigure
      id="measures-per-event"
      path={path}
      title="Measures scored at each fiscal event"
      subtitle="Number of tax and spending measures at each event in the OBR policy measures database. Below: their average size in the third year, ignoring sign."
      takeaway={`${latest.name} had ${latest.count} measures scored by the OBR. The most at any event since 2010 was ${top.count}, at ${top.name}.`}
      csv={{ header: ["event", "date", "measures", "average size in year 3, £bn"], rows: recent.map((row) => [row.name, row.date, row.count, row.averageBn == null ? null : Number(row.averageBn.toFixed(3))]) }}
      source={{ ...OBR_SOURCE, title: "Policy measures database", releaseDate }}
    >
      <SignedBars points={counts} unit="count" name="Measures" positiveLabel={`Measures (${latest.name} in blue)`} negativeLabel="" highlight={counts.at(-1)!.period} tickLabel="year" tickEvery={4} />
      {sizes.length >= 2 ? (
        <div className="mt-4">
          <p className="text-xs font-medium">Average size of a measure in its third year, £ billion</p>
          <SignedBars points={sizes} unit="bn" name="Average size" positiveLabel="Average size, either sign" negativeLabel="" highlight={sizes.at(-1)!.period} tickLabel="year" tickEvery={4} height="h-40" />
        </div>
      ) : null}
    </StoryFigure>
  );
}

const CHANGE_SEGMENTS = [
  { key: "debtInterest", name: "Debt interest", color: "#1d4ed8", darkColor: "#93c5fd" },
  { key: "welfare", name: "Welfare", color: "#3b82f6", darkColor: "#60a5fa" },
  { key: "otherSpending", name: "Other spending", color: "#93c5fd", darkColor: "#bfdbfe" },
  { key: "receipts", name: "Receipts", color: "#a3a3a3", darkColor: "#737373" },
  { key: "policy", name: "Policy decisions", color: "#d97706", darkColor: "#fbbf24" },
] as const;

/** What moved the borrowing forecast since the previous OBR forecast: the economy and other forecast changes against this event's decisions. */
export function BorrowingChangesFigure({ efo, path }: Props) {
  const points = efo.borrowingChanges ?? [];
  if (points.length < 2 || !efo.previousLabel) return null;
  const first = points[0]!;
  const forecastPart = (point: (typeof points)[number]) => (point.total ?? 0) - (point.policy ?? 0);
  const forecastBigger = Math.abs(forecastPart(first)) > Math.abs(first.policy ?? 0);
  const debt = first.debtInterest ?? 0;
  return (
    <StoryFigure
      id="what-moved-borrowing"
      path={path}
      title={forecastBigger ? `Forecast changes moved borrowing more than the decisions in ${first.period}` : `The decisions moved borrowing more than forecast changes in ${first.period}`}
      subtitle={`Change in borrowing since the ${efo.previousLabel} forecast, £ billion, by financial year. Above zero adds to borrowing; below zero reduces it. Policy decisions include their indirect effects on the economy.`}
      takeaway={`Borrowing for ${first.period} is forecast ${formatUnit(Math.abs(first.total ?? 0), "bn")} ${(first.total ?? 0) >= 0 ? "higher" : "lower"} than in the ${efo.previousLabel} forecast. Changes other than policy account for ${formatUnit(forecastPart(first), "bn")} of that, including ${formatUnit(debt, "bn")} from debt interest; policy decisions account for ${formatUnit(first.policy ?? 0, "bn")}.`}
      csv={{ header: ["period", "total change £bn", "debt interest £bn", "welfare £bn", "other spending £bn", "receipts £bn", "policy decisions £bn"], rows: points.map((p) => [p.period, p.total, p.debtInterest, p.welfare, p.otherSpending, p.receipts, p.policy]) }}
      source={src(efo, `${efo.currentLabel ?? "Latest"} Economic and fiscal outlook, table "Public sector net borrowing: changes since ${efo.previousLabel}"`)}
    >
      <StackedBars points={points} segments={[...CHANGE_SEGMENTS]} unit="bn" netKey="total" netName="Total change" />
    </StoryFigure>
  );
}

/** Household income per head by decade, ONS outturn only. */
export function RhdiDecadesFigure({ decades, path, releaseDate, priceYear }: { decades: RhdiDecade[]; path: string; releaseDate: string | null; priceYear: string | null }) {
  if (decades.length < 3) return null;
  const latest = decades.at(-1)!;
  const slowest = [...decades].sort((a, b) => a.growthPct - b.growthPct)[0]!;
  const fastest = [...decades].sort((a, b) => b.growthPct - a.growthPct)[0]!;
  const label = (row: RhdiDecade) => (row.partial ? `${row.decade} (${row.from}–${String(row.to).slice(2)})` : row.decade);
  const growth = decades.map((row) => ({ period: label(row), value: row.growthPct, label: `${row.from} to ${row.to}` }));
  const cash = decades.map((row) => ({ period: label(row), value: row.changeGbp, label: `${row.from} to ${row.to}` }));
  return (
    <StoryFigure
      id="income-by-decade"
      path={path}
      title={slowest.decade === latest.decade ? `Household income per head has grown more slowly since ${latest.from} than in any decade since the 1960s` : "Growth in household income per head, decade by decade"}
      subtitle={`Real household disposable income per head, average yearly growth, per cent. ${latest.partial ? `The ${latest.decade} run from ${latest.from} to ${latest.to}, the latest annual figure.` : ""} ONS outturn only.`}
      takeaway={`Real household disposable income per head grew by an average of ${formatUnit(latest.growthPct, "pct")} a year from ${latest.from} to ${latest.to}, or ${formatUnit(latest.changeGbp, "gbp")} per person${priceYear ? ` in ${priceYear} prices` : ""}. The fastest decade was the ${fastest.decade}, at ${formatUnit(fastest.growthPct, "pct")} a year.`}
      csv={{ header: ["decade", "from", "to", "average yearly growth %", "change per head £ (CVM)", "partial"], rows: decades.map((row) => [row.decade, row.from, row.to, row.growthPct, row.changeGbp, row.partial ? "yes" : "no"]) }}
      source={{ publisher: "Office for National Statistics", title: "UK Economic Accounts, series CRXX: real households' disposable income per head, chained volume measure", url: "https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/crxx/ukea", licenceUrl: "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/", releaseDate }}
    >
      <SignedBars points={growth} unit="pct" name="Average yearly growth" positiveLabel={latest.partial ? `Average yearly growth (${latest.decade} so far in blue)` : "Average yearly growth"} negativeLabel="" highlight={growth.at(-1)!.period} />
      <div className="mt-4">
        <p className="text-xs font-medium">Change in income per head over the period, £{priceYear ? `, ${priceYear} prices` : ""}</p>
        <SignedBars points={cash} unit="gbp" name="Change per head" positiveLabel="£ per head" negativeLabel="" highlight={cash.at(-1)!.period} height="h-40" />
      </div>
    </StoryFigure>
  );
}

/** The OBR's GDP growth forecast against the range of independent forecasts compiled by HM Treasury. */
export function IndependentForecastsFigure({ efo, independent, path }: Props & { independent: { title: string; url: string; releaseDate: string | null; years: { year: string; average: number | null; median: number | null; highest: number | null; lowest: number | null; count: number }[] } | undefined }) {
  if (!independent || !efo.gdp) return null;
  const points = independent.years.flatMap((row) => {
    const obr = efo.gdp!.points.find((point) => point.period === row.year)?.current ?? null;
    return obr == null ? [] : [{ period: row.year, lowest: row.lowest, highest: row.highest, average: row.average, median: row.median, dot: obr }];
  });
  if (points.length === 0) return null;
  const position = (point: (typeof points)[number]) => (point.dot == null || point.average == null ? null : point.dot < point.average ? "below" : point.dot > point.average ? "above" : "in line with");
  const last = points.at(-1)!;
  const atBottom = last.lowest != null && last.dot != null && last.dot <= last.lowest;
  const label = efo.gdp.currentLabel;
  return (
    <StoryFigure
      id="independent-forecasts"
      path={path}
      title={atBottom ? `The OBR's ${last.period} growth forecast is at the low end of independent forecasts` : `The OBR's growth forecast against independent forecasts`}
      subtitle={`Real GDP growth, per cent, by calendar year. The OBR ${label} forecast against independent forecasts compiled by HM Treasury (${independent.title.replace(/^Forecasts for the UK economy:?\s*/i, "")}), which excludes the OBR, IMF and OECD.`}
      takeaway={points.map((point) => `For ${point.period}, the OBR forecasts ${formatUnit(point.dot, "pct")}, ${position(point) ?? "against"} the independent average of ${formatUnit(point.average, "pct")} (range ${formatUnit(point.lowest, "pct")} to ${formatUnit(point.highest, "pct")}).`).join(" ")}
      csv={{ header: ["year", `OBR ${label} %`, "independent average %", "independent median %", "lowest %", "highest %"], rows: points.map((point) => [point.period, point.dot, point.average, point.median, point.lowest, point.highest]) }}
      source={{ publisher: "OBR and HM Treasury", title: `${efoSourceTitle(efo)}; independent forecasts compiled by HM Treasury, ${independent.title}`, url: independent.url, releaseDate: independent.releaseDate, licenceUrl: OBR_SOURCE.licenceUrl }}
    >
      <RangeCompare points={points} unit="pct" dotName={`OBR ${label}`} />
      <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-300">All of these are forecasts, not outturns. The independent range covers forecasts received in the three months before HM Treasury&apos;s publication, so some predate the OBR forecast.</p>
    </StoryFigure>
  );
}
