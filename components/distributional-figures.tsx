import { StoryFigure } from "@/components/story-figure";
import { StackedBars } from "@/components/story-charts";
import { distributionalFigure, type DistributionalFigure, type HmtDistributional } from "@/lib/hmt-distributional";
import { formatUnit } from "@/lib/story-format";

const OGL = "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/";
export const READ_FROM_CHARTS = "Values read from HM Treasury's published charts; not an official table.";

const SEGMENTS = [
  { key: "tax", name: "Tax", color: "#1d4ed8", darkColor: "#93c5fd" },
  { key: "welfare", name: "Welfare", color: "#3b82f6", darkColor: "#60a5fa" },
  { key: "publicServices", name: "Public services (benefits in kind)", color: "#a3a3a3", darkColor: "#737373" },
];

const shortGroup = (group: string) => group.replace(" decile", "").replace("All households", "All");

function points(figure: DistributionalFigure) {
  return figure.rows.map((row) => ({ period: shortGroup(row.group), tax: row.tax, welfare: row.welfare, publicServices: row.publicServices, overall: row.overall }));
}

function csv(figures: DistributionalFigure[]) {
  return {
    header: ["figure", "year", "unit", "income decile", "tax", "welfare", "public services (benefits in kind)", "overall", "values read from HM Treasury charts"],
    rows: figures.flatMap((figure) =>
      figure.rows.map((row) => [figure.figure, figure.year, figure.unit === "pct" ? "% of net income" : "£ per year", row.group, row.tax, row.welfare, row.publicServices, row.overall, "yes"]),
    ),
  };
}

function source(data: HmtDistributional, figures: DistributionalFigure[]) {
  return { publisher: data.publisher, title: `${data.title}, Figures ${figures.map((figure) => figure.figure).join(" and ")} (values read from the charts)`, url: data.documentUrl, releaseDate: data.published, licenceUrl: OGL };
}

function Note({ data, figures }: { data: HmtDistributional; figures: DistributionalFigure[] }) {
  return (
    <p className="mt-2 text-xs text-neutral-700 dark:text-neutral-300">
      {READ_FROM_CHARTS} Read from the vector shapes in the PDF and rounded to {figures.map((figure) => `${figure.rounding} (${figure.figure})`).join(", ")}. HM Treasury estimates against a counterfactual of no policy change; it excludes business taxes, regulation such as the National Living Wage, and the effects of borrowing.{" "}
      <a className="underline underline-offset-4" href={data.pageUrl}>
        Supporting documents
      </a>
      .
    </p>
  );
}

const pick = (figure: DistributionalFigure, group: string) => figure.rows.find((row) => row.group === group)!;

function ImpactPair({ data, path, id, pctId, gbpId, title }: { data: HmtDistributional; path: string; id: string; pctId: string; gbpId: string; title: (pct: DistributionalFigure) => string }) {
  const pct = distributionalFigure(data, pctId);
  const gbp = distributionalFigure(data, gbpId);
  if (!pct) return null;
  const figures = gbp ? [pct, gbp] : [pct];
  const bottom = pick(pct, "Bottom decile");
  const top = pick(pct, "Top decile");
  const all = pick(pct, "All households");
  const allGbp = gbp ? pick(gbp, "All households") : null;
  return (
    <StoryFigure
      id={id}
      path={path}
      title={title(pct)}
      subtitle={`Change in household net income from the decisions, by equivalised net income decile, ${pct.year}, per cent of net income${gbp ? " (below: £ a year)" : ""}. HM Treasury estimate. ${READ_FROM_CHARTS}`}
      takeaway={`HM Treasury estimates the decisions change net income in ${pct.year} by ${formatUnit(bottom.overall, "pct2")} for the bottom income decile and ${formatUnit(top.overall, "pct2")} for the top decile; across all households, ${formatUnit(all.overall, "pct2")}${allGbp ? ` (${formatUnit(allGbp.overall, "gbp")} a year)` : ""}. ${READ_FROM_CHARTS}`}
      csv={csv(figures)}
      source={source(data, figures)}
    >
      <StackedBars points={points(pct)} segments={SEGMENTS} unit="pct2" netKey="overall" netName="Overall" />
      {gbp ? (
        <div className="mt-4">
          <p className="text-xs font-medium">£ per household a year</p>
          <StackedBars points={points(gbp)} segments={SEGMENTS} unit="gbp" netKey="overall" netName="Overall" height="h-48" />
        </div>
      ) : null}
      <Note data={data} figures={figures} />
    </StoryFigure>
  );
}

/** The event's own decisions (Figures 1.A and 1.B). */
export function DistributionalImpactFigure({ data, path }: { data: HmtDistributional; path: string }) {
  return <ImpactPair data={data} path={path} id="distributional-impact" pctId="1.A" gbpId="1.B" title={(pct) => `HM Treasury's estimate of how ${data.eventName} decisions affect households, by income decile, ${pct.year}`} />;
}

/** Decisions from the earlier event onwards (Figures 1.C and 1.D). */
export function DistributionalCumulativeFigure({ data, path }: { data: HmtDistributional; path: string }) {
  return <ImpactPair data={data} path={path} id="distributional-cumulative" pctId="1.C" gbpId="1.D" title={(pct) => `HM Treasury's estimate of decisions since Autumn Budget 2024, by income decile, ${pct.year}`} />;
}

const net = (value: number) =>
  value >= 0 ? `receives spending worth ${formatUnit(value, "pct")} of its net income more than it pays in tax` : `pays ${formatUnit(Math.abs(value), "pct")} of its net income more in tax than it receives in spending`;

/** All tax paid and spending received, not just recent decisions (Figure 1.E). */
export function DistributionalLevelsFigure({ data, path }: { data: HmtDistributional; path: string }) {
  const levels = distributionalFigure(data, "1.E");
  if (!levels) return null;
  const bottom = pick(levels, "Bottom decile");
  const top = pick(levels, "Top decile");
  return (
    <StoryFigure
      id="distributional-levels"
      path={path}
      title={`Tax paid and public spending received, by income decile, ${levels.year}`}
      subtitle={`All tax paid (below zero) and welfare and public services received (above zero), per cent of net income, by equivalised net income decile. HM Treasury estimate. ${READ_FROM_CHARTS}`}
      takeaway={`HM Treasury estimates that in ${levels.year} the bottom income decile ${net(bottom.overall)}, and the top decile ${net(top.overall)}. ${READ_FROM_CHARTS}`}
      csv={csv([levels])}
      source={source(data, [levels])}
    >
      <StackedBars points={points(levels)} segments={SEGMENTS} unit="pct" netKey="overall" netName="Net (spending received minus tax)" />
      <Note data={data} figures={[levels]} />
    </StoryFigure>
  );
}
