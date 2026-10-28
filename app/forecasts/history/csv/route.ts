import { seriesCsv, vintageLabel } from "@/lib/forecasts-view";
import { readSnapshot, takeSnapshot } from "@/lib/store";

export const revalidate = 3600;

export async function GET(): Promise<Response> {
  const loaded = await readSnapshot("obr-databank");
  const obr = takeSnapshot("obr-databank", loaded.snapshot);
  const body = seriesCsv(obr?.data.series ?? [], vintageLabel(obr?.data.round ?? null));
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="obr-databank-history.csv"',
    },
  });
}
