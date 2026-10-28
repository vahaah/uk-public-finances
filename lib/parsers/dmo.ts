import { parsePublishedNumber } from "@/lib/numbers";
import type { dmoDataSchema } from "@/lib/schema";
import type { z } from "zod";

type DmoData = z.infer<typeof dmoDataSchema>;

const UNIT_NOTE =
  "Figures are the raw GetSalesData fields. Budget does not rescale them. Index-linked share is the index-linked field divided by the portfolio field.";

export function parseDmoSales(body: unknown): DmoData {
  if (!body || typeof body !== "object") throw new Error("DMO sales payload is not an object");
  const record = body as Record<string, unknown>;
  const total = parsePublishedNumber(record.UpliftedNominalValueGiltPortfolio as number | string);
  const conventional = parsePublishedNumber(
    record.UpliftedNominalValueGiltPortfolioConventional as number | string,
  );
  const indexLinked = parsePublishedNumber(record.UpliftedNominalValueGiltPortfolioIl as number | string);
  const maturity = parsePublishedNumber(record.AverageMaturity as number | string);
  if (total == null || conventional == null || indexLinked == null || maturity == null) {
    throw new Error("DMO sales payload is missing portfolio fields");
  }
  if (total === 0) throw new Error("DMO portfolio total is zero");
  return {
    portfolio: {
      rawTotal: total,
      rawConventional: conventional,
      rawIndexLinked: indexLinked,
      averageMaturityYears: maturity,
      indexLinkedShare: indexLinked / total,
      unitNote: UNIT_NOTE,
    },
    maturity: null,
  };
}

export type GiltRow = {
  name: string;
  redemption: string;
  nominal: number;
  indexLinked: boolean;
};

/** Bucket a D1A-style instrument list. Nominal is whatever unit the export uses. */
export function maturityBuckets(rows: GiltRow[], asOf: string): NonNullable<DmoData["maturity"]> {
  const asOfDate = new Date(`${asOf}T00:00:00Z`);
  const buckets = [
    { label: "Under 5 years", nominal: 0 },
    { label: "5 to 10 years", nominal: 0 },
    { label: "10 to 20 years", nominal: 0 },
    { label: "20 years and over", nominal: 0 },
  ];
  for (const row of rows) {
    const redemption = new Date(`${row.redemption}T00:00:00Z`);
    const years = (redemption.getTime() - asOfDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (!Number.isFinite(years) || years < 0) continue;
    const index = years < 5 ? 0 : years < 10 ? 1 : years < 20 ? 2 : 3;
    const bucket = buckets[index];
    if (bucket) bucket.nominal += row.nominal;
  }
  return { asOf, buckets };
}
