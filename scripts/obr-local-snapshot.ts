/**
 * Build a budgets-obr snapshot from OBR workbooks on disk, with the same parsers the
 * daily workflow uses. For previews and checks before uploading to Blob.
 *   npx tsx scripts/obr-local-snapshot.ts <out.json> historical=<xlsx> measures=<xlsx> evaluation=<xlsx> efo=<xlsx> [efo=<xlsx> ...]
 */
import { readFileSync, writeFileSync } from "node:fs";

import { efoVintages, parseEfoCharts } from "@/lib/budgets/efo";
import { parseEvaluationWorkbook, parseHistoricalForecasts, parseMeasuresWorkbook, type ForecastVintage } from "@/lib/budgets/forecasts";
import { loadSeedEvents } from "@/lib/budgets/seed";
import { snapshotSchemas } from "@/lib/schema";
import { readXlsx } from "@/lib/sheets";
import { buildEnvelope } from "@/lib/snapshot";

async function main() {
  const [out, ...args] = process.argv.slice(2);
  if (!out) throw new Error("usage: obr-local-snapshot.ts <out.json> key=path ...");
  const files = args.map((arg) => arg.split("=") as [string, string]);
  const one = (key: string) => files.find(([name]) => name === key)?.[1];
  const events = loadSeedEvents();
  const measureEvents = events.map((event) => ({ name: event.name, date: event.date }));
  const historicalPath = one("historical");
  const historical = historicalPath
    ? { loaded: true as const, ...(await parseHistoricalForecasts(readFileSync(historicalPath))) }
    : { loaded: false as const, asOf: null, vintages: [] as ForecastVintage[] };
  const measuresPath = one("measures");
  const measures = measuresPath ? { loaded: true as const, ...(await parseMeasuresWorkbook(readFileSync(measuresPath), measureEvents)) } : { loaded: false as const, asOf: null, rows: [] };
  const evaluationPath = one("evaluation");
  const evaluation = evaluationPath ? { loaded: true as const, ...(await parseEvaluationWorkbook(readFileSync(evaluationPath))) } : { loaded: false as const, asOf: null, rows: [] };
  const efoPaths = files.filter(([name]) => name === "efo" || name === "evaluation").map(([, path]) => path);
  const parsed = efoPaths.length ? parseEfoCharts(await Promise.all(efoPaths.map((path) => readXlsx(readFileSync(path), 60)))) : null;
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const [month, year] = (parsed?.currentLabel ?? "").split(" ");
  const prefix = `${year}-${String(months.indexOf(month ?? "") + 1).padStart(2, "0")}`;
  const eventDate = events.filter((event) => event.date.startsWith(prefix) && event.obrForecast !== "no")[0]?.date ?? null;
  const efo = parsed ? { ...parsed, eventDate } : null;
  if (efo?.eventDate) historical.vintages.push(...efoVintages(efo, efo.eventDate, historical.vintages));
  const envelope = buildEnvelope({
    sourceId: "budgets-obr",
    retrievedAt: new Date().toISOString(),
    releaseDate: efo?.eventDate ?? historical.asOf,
    nextRelease: null,
    sourceUrl: "https://obr.uk/data/",
    sourceTitle: "OBR files uploaded to Blob",
    data: { efo: { loaded: Boolean(efo), files: efoPaths, data: efo }, historical, measures, evaluation, headroom: { loaded: false, asOf: null, rows: [] } },
  });
  snapshotSchemas["budgets-obr"].parse(envelope);
  writeFileSync(out, JSON.stringify(envelope));
  console.log(`wrote ${out}: ${historical.vintages.length} vintages, ${measures.rows.length} measures, efo ${efo?.found.join(",") ?? "none"} for ${efo?.eventDate}`);
}

void main();
