import { hmtDistributionalSchema } from "@/lib/schema";
import type { z } from "zod";

/**
 * HM Treasury's distributional analysis ("Impact on households") is published only as charts in a
 * PDF. The values are read from the chart geometry with scripts/hmt-distributional/digitise.py and
 * uploaded by hand as JSON under this Blob prefix, one file per fiscal event.
 */
export const HMT_DISTRIBUTIONAL_PREFIX = "manual/hmt/distributional/";

export type HmtDistributional = z.infer<typeof hmtDistributionalSchema>;
export type DistributionalFigure = HmtDistributional["figures"][number];

/** The newest valid file by publication date. Invalid files are reported, not used. */
export function pickDistributional(files: { pathname: string; body: unknown }[]): { file: string | null; data: HmtDistributional | null; errors: string[] } {
  const errors: string[] = [];
  const valid = files.flatMap((file) => {
    const parsed = hmtDistributionalSchema.safeParse(file.body);
    if (!parsed.success) {
      errors.push(`${file.pathname}: ${parsed.error.issues[0]?.message ?? "invalid"}`);
      return [];
    }
    return [{ file: file.pathname, data: parsed.data }];
  });
  const latest = valid.sort((a, b) => b.data.published.localeCompare(a.data.published) || b.file.localeCompare(a.file))[0];
  return { file: latest?.file ?? null, data: latest?.data ?? null, errors };
}

export function distributionalFigure(data: HmtDistributional | null | undefined, figure: string): DistributionalFigure | null {
  return data?.figures.find((item) => item.figure === figure) ?? null;
}
