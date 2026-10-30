import { StoryFigure } from "@/components/story-figure";
import { MultiLine, SignedBars } from "@/components/story-charts";
import { formatUnit } from "@/lib/story-format";
import { DEPARTMENT_SERIES, PER_PERSON_SERIES, departmentsReal, perPersonByFunction, priceBase, realChange } from "@/lib/spending-real";
import type { SnapshotOf } from "@/lib/schema";

type Pesa = SnapshotOf<"pesa">;
const OGL = "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/";

/** Spending per person on health, education, defence and social protection, real terms. PESA ÷ ONS UKPOP, HMT deflator. */
export function PerPersonFigure({ pesa, population, path }: { pesa: Pesa; population: { period: string; value: number }[] | undefined; path: string }) {
  const deflators = pesa.data.deflators;
  if (!deflators || !population?.length) return null;
  const points = perPersonByFunction(pesa.data.functionHistory, deflators, population);
  if (points.length < 5) return null;
  const base = priceBase(deflators);
  const first = points[0]!.period as string;
  const last = points.at(-1)!.period as string;
  const health = points.at(-1)!.health as number | null;
  const healthChange = realChange(points, "health", first, last);
  return (
    <StoryFigure
      id="per-person"
      path={path}
      title={healthChange != null && healthChange > 0 ? `Health spending per person is up ${healthChange.toFixed(0)}% in real terms since ${first}` : "Spending per person by area, in real terms"}
      subtitle={`£ per person a year, ${base} prices. Spending on services by function (PESA) divided by the UK mid-year population.`}
      takeaway={`In ${last}, public spending on health was ${health == null ? "n/a" : formatUnit(health, "gbp")} per person in ${base} prices${healthChange == null ? "" : `, ${healthChange >= 0 ? "up" : "down"} ${Math.abs(healthChange).toFixed(0)}% in real terms since ${first}`}.`}
      csv={{ header: ["financial year", ...PER_PERSON_SERIES.map((series) => `${series.name} £ per person (${base} prices)`)], rows: points.map((point) => [point.period as string, ...PER_PERSON_SERIES.map((series) => point[series.key] as number | null)]) }}
      source={{ publisher: "HM Treasury and ONS", title: `PESA table 4.2 by function; ONS UKPOP mid-year population; HM Treasury GDP deflators (${base} = 100)`, url: pesa.sourceUrl, releaseDate: pesa.releaseDate, licenceUrl: OGL, sourceId: undefined }}
    >
      <MultiLine points={points} series={PER_PERSON_SERIES} unit="gbp" />
    </StoryFigure>
  );
}

/** Departmental budgets (DEL) in real terms: outturn and Spending Review plans. */
export function DepartmentsRealFigure({ pesa, path }: { pesa: Pesa; path: string }) {
  const deflators = pesa.data.deflators;
  if (!deflators) return null;
  const { points, plansFrom } = departmentsReal(pesa.data.departmentHistory, deflators);
  if (points.length < 3) return null;
  const base = priceBase(deflators);
  const lastOutturn = [...points].reverse().find((point) => !plansFrom || (point.period as string) < plansFrom)?.period as string | undefined;
  const end = points.at(-1)!.period as string;
  const change = (key: string) => (lastOutturn ? realChange(points, key, lastOutturn, end) : null);
  const otherChange = change("other");
  const healthChange = change("health");
  const defenceChange = change("defence");
  const words = (value: number | null) => (value == null ? "n/a" : `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}%`);
  return (
    <StoryFigure
      id="departments-real"
      path={path}
      title={otherChange != null && otherChange < 0 && (healthChange ?? 0) > 0 && (defenceChange ?? 0) > 0 ? "Plans: health and defence grow in real terms, other departments shrink" : "Departmental budgets in real terms, outturn and plans"}
      subtitle={`£ billion, ${base} prices. Central government spending within departmental expenditure limits (PESA table 6.1). Dashed years are plans, deflated with the OBR's forecast GDP deflator as published by HM Treasury.`}
      takeaway={lastOutturn ? `Between ${lastOutturn} and ${end}, in real terms, plans change Health and Social Care by ${words(healthChange)}, Defence by ${words(defenceChange)} and all other departments together by ${words(otherChange)}.` : "Departmental budgets in real terms."}
      csv={{ header: ["financial year", "basis", ...DEPARTMENT_SERIES.map((series) => `${series.name} £bn (${base} prices)`)], rows: points.map((point) => [point.period as string, plansFrom && (point.period as string) >= plansFrom ? "plans" : "outturn", ...DEPARTMENT_SERIES.map((series) => point[series.key] as number | null)]) }}
      source={{ publisher: "HM Treasury", title: `PESA table 6.1; GDP deflators at market prices (${base} = 100), including OBR forecast years`, url: pesa.sourceUrl, releaseDate: pesa.releaseDate, licenceUrl: OGL }}
    >
      <MultiLine points={points} series={DEPARTMENT_SERIES} unit="bn" forecastFrom={plansFrom} forecastLabel="Plans" />
      <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-300">Plans are from the latest PESA and may not include changes announced at later fiscal events.</p>
    </StoryFigure>
  );
}

/** DfE school funding per pupil aged 5-16, England, real terms. */
export function PerPupilFigure({ pesa, path }: { pesa: Pesa; path: string }) {
  const data = pesa.data.perPupil;
  if (!data || data.rows.length < 5) return null;
  const first = data.rows[0]!;
  const last = data.rows.at(-1)!;
  const change = ((last.realGbp - first.realGbp) / first.realGbp) * 100;
  const points = data.rows.map((row) => ({ period: row.year, value: row.realGbp, label: row.year }));
  return (
    <StoryFigure
      id="per-pupil"
      path={path}
      title={`School funding per pupil in England is ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(0)}% in real terms since ${first.year}`}
      subtitle={`Revenue funding per pupil aged 5–16 in state-funded schools, England, £, ${data.priceYear} prices. ${last.year} is based on allocations and the Spending Review settlement, partly estimated.`}
      takeaway={`DfE figures put school funding at ${formatUnit(last.realGbp, "gbp")} per pupil in ${last.year} (${data.priceYear} prices), against ${formatUnit(first.realGbp, "gbp")} in ${first.year}.`}
      csv={{ header: ["financial year", `per pupil £ (${data.priceYear} prices)`, "per pupil £ cash", "pupils (FTE)"], rows: data.rows.map((row) => [row.year, row.realGbp, row.cashGbp, row.pupils]) }}
      source={{ publisher: "Department for Education", title: "School funding statistics, revenue funding per pupil (national table)", url: data.url, releaseDate: data.releaseDate, licenceUrl: OGL }}
    >
      <SignedBars points={points} unit="gbp" name="Per pupil" positiveLabel={`£ per pupil, ${data.priceYear} prices (latest year in blue)`} negativeLabel="" highlight={last.year} />
      <p className="mt-1 text-xs text-neutral-700 dark:text-neutral-300">England only. Education is devolved; Scotland, Wales and Northern Ireland publish their own figures.</p>
    </StoryFigure>
  );
}
