import type { ReactNode } from "react";

import { ChartFrame, SourceNote } from "@/components/blocks";
import { CiteShare } from "@/components/cite-share";
import { formatDateLong } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

/**
 * A story chart: title as the finding, the chart, a CSV download, a cite button
 * and the publisher source line. Every figure on the story pages uses this.
 */
export function StoryFigure({
  id,
  path,
  title,
  subtitle,
  takeaway,
  children,
  csv,
  source,
}: {
  id: string;
  path: string;
  title: string;
  subtitle?: string;
  takeaway: string;
  children: ReactNode;
  csv: { header: string[]; rows: (string | number | null)[][] };
  source: { publisher: string; title: string; url: string; releaseDate: string | null; licenceUrl: string; sourceId?: "budgets-obr" | "ons-psf" | "obr-databank" };
}) {
  const body = [csv.header, ...csv.rows].map((row) => row.map((cell) => (cell == null ? "" : String(cell).includes(",") ? `"${cell}"` : String(cell))).join(",")).join("\n");
  const href = `data:text/csv;charset=utf-8,${encodeURIComponent(body)}`;
  const url = `${SITE_URL}${path}#${id}`;
  const citation = `${takeaway} Source: ${source.publisher}, ${source.title}${source.releaseDate ? `, published ${formatDateLong(source.releaseDate)}` : ""}. Via ${url.replace("https://", "")}.`;
  return (
    <figure id={id} className="scroll-mt-40 md:scroll-mt-28">
      <ChartFrame title={title} subtitle={subtitle} source={<SourceNote {...source} />}>
        <p className="sr-only">{takeaway}</p>
        {children}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <a href={href} download={`${id}.csv`} className="inline-flex h-8 items-center rounded-md border border-neutral-300 px-3 text-xs dark:border-neutral-700">
            Download CSV
          </a>
          <CiteShare sentence={takeaway} citation={citation} url={url} />
        </div>
      </ChartFrame>
    </figure>
  );
}
