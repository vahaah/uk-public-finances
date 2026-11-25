import { SITE_URL } from "@/lib/site";
import type { SourceId } from "@/lib/schema";

function absolute(path: string): string {
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

/** URLs whose content changes when this source publishes. Noindex paths are not included. */
export function indexNowUrls(sourceId: SourceId, events: { slug: string }[], explainedPath: string | null): string[] {
  const budgets = events.map((event) => `/budgets/${event.slug}`);
  const explained = explainedPath ? [explainedPath] : [];
  let paths: string[];
  switch (sourceId) {
    case "ons-psf":
      paths = ["/", "/borrowing", "/debt", "/forecasts", "/records", "/budgets", "/faq", ...budgets];
      break;
    case "ons-prices":
      paths = ["/", "/old-money", "/receipts", "/spending", "/borrowing", ...explained];
      break;
    case "hmrc-receipts":
      paths = ["/receipts", "/records", "/faq"];
      break;
    case "pesa":
      paths = ["/spending", ...explained];
      break;
    case "dmo-gilts":
      paths = ["/debt"];
      break;
    case "boe-yields":
      paths = ["/debt"];
      break;
    case "hmrc-income-tax":
      paths = ["/taxpayers"];
      break;
    case "obr-databank":
      paths = ["/forecasts", "/forecasts/history", "/faq"];
      break;
    case "budgets-events":
      paths = ["/budgets", ...budgets];
      break;
    case "budgets-obr":
      paths = ["/budgets", "/budgets/rules", "/forecasts", "/taxpayers", ...budgets, ...explained];
      break;
    case "ofgem-cap":
      paths = explained;
      break;
    default: {
      const neverSource: never = sourceId;
      return neverSource;
    }
  }
  return [...new Set(paths)].map(absolute);
}

export async function postIndexNow(urls: string[]): Promise<number> {
  const key = process.env.INDEXNOW_KEY;
  if (!key || urls.length === 0) return 0;
  const host = process.env.INDEXNOW_HOST ?? "budget.vahaah.com";
  let submitted = 0;
  for (let index = 0; index < urls.length; index += 100) {
    const urlList = urls.slice(index, index + 100);
    const response = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ host, key, urlList }),
    });
    if (response.status !== 200 && response.status !== 202) throw new Error(`IndexNow ${response.status}`);
    submitted += urlList.length;
  }
  return submitted;
}
