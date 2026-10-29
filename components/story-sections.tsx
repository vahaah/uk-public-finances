import { StoryFigure } from "@/components/story-figure";
import { CompareBars, LongRunLine, SignedBars, VintagesLine } from "@/components/story-charts";
import { formatUnit } from "@/lib/story-format";
import { financialYearOf } from "@/lib/budgets/events";
import { efoSourceTitle, OBR_SOURCE, SERIES_META, type EfoData, type EventCompare } from "@/lib/story";

type Props = { efo: EfoData; path: string };

const src = (efo: EfoData, extra?: string) => ({ ...OBR_SOURCE, title: extra ?? efoSourceTitle(efo), releaseDate: efo.eventDate });
const forecastFrom = (efo: EfoData) => (efo.eventDate ? financialYearOf(efo.eventDate) : null);
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
      title="Growth was marked down for next year"
      subtitle="Real GDP growth, per cent, by calendar year."
      takeaway={next ? `The OBR now expects the economy to grow ${formatUnit(next.current, "pct")} in ${next.period}, down from ${formatUnit(next.previous, "pct")} in its ${efo.gdp.previousLabel} forecast.` : "Real GDP growth forecasts compared."}
      csv={compareCsv(points, efo.gdp.currentLabel, efo.gdp.previousLabel)}
      source={src(efo)}
    >
      <CompareBars points={points} currentLabel={efo.gdp.currentLabel} previousLabel={efo.gdp.previousLabel} unit="pct" />
    </StoryFigure>
  );
}

export function CpiFigure({ efo, path }: Props) {
  if (!efo.cpi) return null;
  const year = Number(efo.eventDate?.slice(0, 4) ?? 0);
  const points = efo.cpi.points.filter((point) => Number(point.period) >= year);
  const next = at(points, String(year + 1));
  return (
    <StoryFigure
      id="cpi"
      path={path}
      title="Inflation is expected to stay higher for longer"
      subtitle="CPI inflation, per cent, by calendar year."
      takeaway={next ? `CPI inflation is forecast at ${formatUnit(next.current, "pct")} in ${next.period}, up from ${formatUnit(next.previous, "pct")} in the ${efo.cpi.previousLabel} forecast.` : "CPI inflation forecasts compared."}
      csv={compareCsv(points, efo.cpi.currentLabel, efo.cpi.previousLabel)}
      source={src(efo)}
    >
      <CompareBars points={points} currentLabel={efo.cpi.currentLabel} previousLabel={efo.cpi.previousLabel} unit="pct" />
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
      title="Living standards fall this year, then recover slowly"
      subtitle="Growth in real household disposable income per person, per cent, by financial year."
      takeaway={first ? `Real household disposable income per person is forecast to change by ${formatUnit(first.current, "pct")} in ${first.period}, against ${formatUnit(first.previous, "pct")} in the ${efo.rhdiGrowth.previousLabel} forecast.` : "Household income forecasts compared."}
      csv={compareCsv(points, efo.rhdiGrowth.currentLabel, efo.rhdiGrowth.previousLabel)}
      source={src(efo)}
    >
      <CompareBars points={points} currentLabel={efo.rhdiGrowth.currentLabel} previousLabel={efo.rhdiGrowth.previousLabel} unit="pct" />
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
      title={efo.rhdiRolling.reduce((low, point) => (point.value < low.value ? point : low)).period >= "2015" ? "The slowest growth in living standards on record" : "Growth in living standards over the long run"}
      subtitle="Rolling 10-year average growth in real household disposable income per person, per cent."
      takeaway={`Over the ten years to ${now.period}, real household income per person grew by an average of ${formatUnit(now.value, "pct")} a year. In the ten years to ${first.period} it was ${formatUnit(first.value, "pct")}.`}
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
  return (
    <StoryFigure
      id="borrowing"
      path={path}
      title="Borrowing is higher in every year than planned"
      subtitle="Public sector net borrowing, £ billion, by financial year."
      takeaway={first ? `Borrowing in ${from} is now forecast at ${formatUnit(first.current, "bn")}, up from ${formatUnit(first.previous, "bn")} in the ${efo.psnb.previousLabel} forecast.` : "Borrowing forecasts compared."}
      csv={compareCsv(efo.psnb.points, efo.psnb.currentLabel, efo.psnb.previousLabel)}
      source={src(efo)}
    >
      <CompareBars points={efo.psnb.points} currentLabel={efo.psnb.currentLabel} previousLabel={efo.psnb.previousLabel} unit="bn" />
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
      title="The cost of debt interest over the long run"
      subtitle={`Debt interest spending, per cent of GDP, outturn and ${efo.debtInterest.currentLabel} forecast, with the ${efo.debtInterest.previousLabel} forecast.`}
      takeaway={end && peakPast ? `Debt interest is forecast at ${formatUnit(end.value, "pctGdp")} in ${end.period}. The highest outturn in the series is ${formatUnit(peakPast.value, "pctGdp")} in ${peakPast.period}.` : "Debt interest as a share of GDP."}
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
      title="Give now, take later"
      subtitle="Direct effect of this event's policy decisions on borrowing, £ billion. Above zero adds to borrowing; below zero reduces it."
      takeaway={`The decisions add ${formatUnit(first.value, "bn")} to borrowing in ${first.period} and reduce it by ${formatUnit(Math.abs(last.value), "bn")} in ${last.period}.`}
      csv={{ header: ["period", "total £bn", "current spending £bn", "capital spending £bn", "receipts £bn"], rows: efo.policy.map((point) => [point.period, point.total, point.currentSpending, point.capitalSpending, point.receipts]) }}
      source={src(efo)}
    >
      <SignedBars points={points} unit="bn" name="Effect on borrowing" positiveLabel="Adds to borrowing (giveaway)" negativeLabel="Reduces borrowing (takeaway)" />
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
      takeaway={end && peakPast ? `Taxes are forecast to reach ${formatUnit(end.value, "pctGdp")} by ${end.period}. The highest outturn since 1948-49 is ${formatUnit(peakPast.value, "pctGdp")} in ${peakPast.period}.` : "The tax burden over time."}
      csv={{ header: ["period", "outturn % GDP", `${efo.taxBurden.currentLabel} forecast % GDP`, `${efo.taxBurden.previousLabel} forecast % GDP`], rows: [...new Set([...outturn.map((p) => p.period), ...efo.taxBurden.points.map((p) => p.period)])].sort().map((period) => [period, outturn.find((p) => p.period === period)?.value ?? null, forecast.find((p) => p.period === period)?.value ?? null, previous.find((p) => p.period === period)?.value ?? null]) }}
      source={src(efo)}
    >
      <LongRunLine points={merged} unit="pctGdp" name="Taxes" forecastFrom={firstForecast} previous={previous} previousName={`${efo.taxBurden.previousLabel} forecast`} />
    </StoryFigure>
  );
}

export function PsnflFigure({ efo, path }: Props) {
  if (!efo.psnfl) return null;
  const peak = efo.psnfl.points.filter((point) => point.current != null).sort((a, b) => (b.current ?? 0) - (a.current ?? 0))[0];
  const end = efo.psnfl.points.filter((point) => point.current != null).at(-1);
  return (
    <StoryFigure
      id="debt"
      path={path}
      title="Debt rises, then is meant to fall"
      subtitle="Public sector net financial liabilities, per cent of GDP, by financial year."
      takeaway={peak && end ? `Net financial liabilities peak at ${formatUnit(peak.current, "pctGdp")} in ${peak.period} and fall to ${formatUnit(end.current, "pctGdp")} by ${end.period}, if the forecast holds.` : "Debt forecasts compared."}
      csv={compareCsv(efo.psnfl.points, efo.psnfl.currentLabel, efo.psnfl.previousLabel)}
      source={src(efo)}
    >
      <CompareBars points={efo.psnfl.points} currentLabel={efo.psnfl.currentLabel} previousLabel={efo.psnfl.previousLabel} unit="pctGdp" />
    </StoryFigure>
  );
}

export function DebtVsOutturnFigure({ efo, path }: Props) {
  const data = efo.debtVsOutturn;
  if (!data || data.points.length < 2) return null;
  const lastOut = data.points.filter((point) => point.outturn != null).at(-1);
  const firstVintage = data.vintages[0];
  return (
    <StoryFigure
      id="debt-forecasts-vs-outturn"
      path={path}
      title="Debt forecasts and what happened"
      subtitle="Debt as a share of GDP: past OBR forecasts against the outturn, as shown in the OBR Forecast evaluation report."
      takeaway={lastOut && firstVintage ? `For ${lastOut.period}, the outturn was ${formatUnit(lastOut.outturn, "pctGdp")}. The ${firstVintage} forecast for that year was ${formatUnit(lastOut.values[0], "pctGdp")}.` : "Past debt forecasts against outturn."}
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
      subtitle="Change to borrowing from policy decisions, per cent of GDP, summed over five years. Above zero is a net giveaway."
      takeaway={`The ${latest.period} decisions changed borrowing by ${formatUnit(latest.value, "pctGdp")} over five years, as measured by the OBR.`}
      csv={{ header: ["event", "% of GDP over 5 years"], rows: points.map((point) => [point.period, point.value]) }}
      source={src(efo)}
    >
      <SignedBars points={points} unit="pctGdp" name="Policy package" positiveLabel="Net giveaway" negativeLabel="Net takeaway" />
    </StoryFigure>
  );
}

export function MeasuresFigure({ rows, path, releaseDate }: { rows: { name: string; date: string; count: number; averageBn: number | null }[]; path: string; releaseDate: string | null }) {
  const recent = rows.filter((row) => row.date >= "2010-01-01");
  if (recent.length < 2) return null;
  const top = [...recent].sort((a, b) => b.count - a.count)[0]!;
  const latest = recent.at(-1)!;
  return (
    <StoryFigure
      id="measures-per-event"
      path={path}
      title="How many measures each event scored"
      subtitle="Number of tax and spending measures at each event in the OBR policy measures database."
      takeaway={`${latest.name} had ${latest.count} scored measures. The most since 2010 was ${top.count}, at ${top.name}.`}
      csv={{ header: ["event", "date", "measures", "average size in year 3, £bn"], rows: recent.map((row) => [row.name, row.date, row.count, row.averageBn == null ? null : Number(row.averageBn.toFixed(3))]) }}
      source={{ ...OBR_SOURCE, title: "Policy measures database", releaseDate }}
    >
      <SignedBars points={recent.map((row) => ({ period: row.date.slice(0, 7), value: row.count }))} unit="count" name="Measures" positiveLabel="Scored measures" negativeLabel="" />
    </StoryFigure>
  );
}
