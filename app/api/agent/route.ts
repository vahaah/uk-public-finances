import { loadBudgetEvent, loadChart, loadLatestFigures, loadSearch } from "@/lib/webmcp-load";
import type { WebmcpToolName } from "@/lib/webmcp";

export const revalidate = 60;

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const tool = url.searchParams.get("tool");
  if (!isTool(tool)) return Response.json({ error: "Unknown tool." }, { status: 404 });
  const body = await runTool(tool, url);
  return Response.json(body, { headers: { "cache-control": "public, max-age=60" } });
}

function isTool(value: string | null): value is WebmcpToolName {
  return value === "get_latest_figures" || value === "search_site" || value === "get_budget_event" || value === "get_chart_data";
}

async function runTool(tool: WebmcpToolName, url: URL): Promise<unknown> {
  switch (tool) {
    case "get_latest_figures":
      return loadLatestFigures();
    case "search_site":
      return { results: await loadSearch(url.searchParams.get("q") ?? "") };
    case "get_budget_event":
      return (await loadBudgetEvent()) ?? { error: "No Budget is loaded." };
    case "get_chart_data":
      return loadChart(url.searchParams.get("id") ?? "", url.searchParams.get("path"));
    default: {
      const exhaustive: never = tool;
      return exhaustive;
    }
  }
}
