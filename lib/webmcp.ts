import type { CommandItem } from "@/lib/command-match";
import { matchCommand } from "@/lib/command-match";
import { formatGbpFromMillions, formatPercent } from "@/lib/format";
import { eventForecastSentence } from "@/lib/headlines";
import { SITE_URL } from "@/lib/site";

const emptyObject = { type: "object", properties: {}, additionalProperties: false } as const;

export const webmcpTools = [
  {
    name: "get_latest_figures",
    description:
      "Latest official UK public sector receipts, spending, borrowing, debt and debt as a share of GDP. Positive borrowing is a deficit. Figures are ONS public sector finances, shown as on this site.",
    inputSchema: emptyObject,
    annotations: { readOnlyHint: true, untrustedContentHint: true },
  },
  {
    name: "search_site",
    description: "Search this site's pages, FAQ and glossary, using the same index as the search palette. Returns titles and links, at most eight.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Words to match. An empty query returns the latest figures and the section pages." } },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
  },
  {
    name: "get_budget_event",
    description: "The latest Budget or fiscal statement: its name, the OBR year-ahead borrowing forecast when one is loaded, and links to the event page and the explained page.",
    inputSchema: emptyObject,
    annotations: { readOnlyHint: true, untrustedContentHint: true },
  },
  {
    name: "get_chart_data",
    description:
      "One chart on this site: its id, the page path, the official series behind it, and the publisher. Monthly charts are receipts-by-month (HMRC) and borrowing-by-month (ONS J5II). by-month alone is not a chart id.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "A chart id such as receipts-by-month or borrowing-by-month, or a page hash such as /receipts#by-month." },
        path: { type: "string", description: "Optional page path. It does not make the shared anchor by-month mean borrowing." },
      },
      required: ["id"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, untrustedContentHint: true },
  },
] as const;

export type WebmcpToolName = (typeof webmcpTools)[number]["name"];

export type LatestFiguresInput = {
  period: string | null;
  releaseDate: string | null;
  receiptsMillions: number | null;
  spendingMillions: number | null;
  /** Bulletin sign. Positive is borrowing. */
  borrowingMillions: number | null;
  debtMillions: number | null;
  debtShareOfGdp: number | null;
  financialYear: string | null;
  financialYearBorrowingMillions: number | null;
};

function money(millions: number | null, series: string) {
  if (millions == null) return null;
  return { text: formatGbpFromMillions(millions), millions, series };
}

export function latestFigures(input: LatestFiguresInput) {
  return {
    period: input.period,
    receipts: money(input.receiptsMillions, "JW2O"),
    spending: money(input.spendingMillions, "KX5Q"),
    borrowing: money(input.borrowingMillions, "J5II"),
    debt: money(input.debtMillions, "KSE6"),
    debtShareOfGdp: input.debtShareOfGdp == null ? null : { text: formatPercent(input.debtShareOfGdp), percent: Number(input.debtShareOfGdp.toFixed(1)), series: "HF6X" },
    financialYear: input.financialYear,
    financialYearBorrowing: money(input.financialYearBorrowingMillions, "J5II"),
    source: {
      publisher: "Office for National Statistics",
      releaseDate: input.releaseDate,
      note: "Public sector finances. Borrowing uses the bulletin sign: positive is borrowing, negative is a surplus. Debt, receipts and spending are not negated.",
    },
  };
}

export function searchSite(items: CommandItem[], query: string) {
  return items
    .filter((item) => matchCommand(item, query))
    .slice(0, 8)
    .map((item) => ({ kind: item.kind, label: item.label, href: item.href, hint: item.hint }));
}

export function budgetEvent(input: { label: string; slug: string; date: string; fy: string | null; forecastBn: number | null }) {
  const sentence = eventForecastSentence(input.label, input.fy, input.forecastBn);
  return {
    name: input.label,
    date: input.date,
    financialYear: input.fy,
    borrowingForecastBillion: input.forecastBn,
    sentence,
    links: {
      event: `${SITE_URL}/budgets/${input.slug}`,
      explained: `${SITE_URL}/budgets/${input.slug}/explained`,
    },
    source: sentence ? "Office for Budget Responsibility, year-ahead public sector net borrowing forecast." : "No OBR year-ahead borrowing forecast is loaded for this event.",
  };
}

export type ChartRef = { id: string; path: string };

/** Tool ids. `by-month` is not one: that anchor is on both the receipts and borrowing pages. */
export const CHARTS: ChartRef[] = [
  { id: "borrowing-by-month", path: "/borrowing" },
  { id: "receipts-by-month", path: "/receipts" },
  { id: "so-far", path: "/borrowing" },
  { id: "ratio", path: "/debt" },
  { id: "by-tax", path: "/receipts" },
  { id: "by-year", path: "/receipts" },
  { id: "by-function", path: "/spending" },
  { id: "yields", path: "/debt" },
];

const MONTHLY: Record<string, string> = {
  "/receipts": "receipts-by-month",
  "/borrowing": "borrowing-by-month",
};

/** An unambiguous id, or a page hash such as `/receipts#by-month`. Bare `by-month` is refused. */
export function resolveChart(input: { id: string; path?: string | null }): ChartRef | { error: string; matches: ChartRef[] } {
  const requested = parseChartInput(input.id, input.path);
  if (requested.id === "by-month") {
    return {
      error: "by-month is used on more than one page. Use receipts-by-month or borrowing-by-month.",
      matches: [
        { id: "receipts-by-month", path: "/receipts" },
        { id: "borrowing-by-month", path: "/borrowing" },
      ],
    };
  }
  const matches = CHARTS.filter((chart) => chart.id === requested.id && (requested.path == null || chart.path === requested.path || (requested.id === "borrowing-by-month" && requested.path === "/")));
  if (matches.length === 1) return matches[0]!;
  if (matches.length === 0) return { error: "Unknown chart.", matches: CHARTS };
  return { error: "This chart id is used on more than one page. Pass path.", matches };
}

function parseChartInput(id: string, path?: string | null): { id: string; path: string | null } {
  const trimmed = id.trim();
  const hash = /^(?:https?:\/\/[^/#]+)?(\/[^#]*)#([A-Za-z0-9-]+)$/.exec(trimmed);
  const explicit = path?.trim() || null;
  if (hash) {
    const page = explicit || hash[1] || null;
    const anchor = hash[2] ?? trimmed;
    if (anchor === "by-month" && page && MONTHLY[page]) return { id: MONTHLY[page], path: page };
    if (anchor === "borrowing-by-month") return { id: "borrowing-by-month", path: page };
    return { id: anchor, path: page };
  }
  if (trimmed === "by-month") return { id: "by-month", path: explicit };
  return { id: trimmed, path: explicit };
}

export type ChartPoint = { period: string; value: number };

export type ChartPayload = {
  id: string;
  title: string;
  unit: string;
  source: { publisher: string; series: string };
  series: { name: string; points: ChartPoint[] }[];
};

export function billions(millions: number, negate = false): number {
  const signed = negate ? -millions : millions;
  return Number((signed / 1000).toFixed(1));
}

export function tail<T>(rows: T[], count = 18): T[] {
  return rows.slice(-count);
}
