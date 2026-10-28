import { formatGbpFromMillions, formatMonth, formatPercent, formatRelease } from "@/lib/format";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SITE_URL } from "@/lib/site";

export async function GET(): Promise<Response> {
  const ons = await readSnapshot("ons-psf");
  const snapshot = takeSnapshot("ons-psf", ons.snapshot);
  const borrowing = snapshot?.data.bulletinSign.borrowingLatest;
  const month = snapshot?.data.series.j5ii?.latest?.period;
  const ratio = snapshot?.data.series.hf6x?.latest?.value;
  const lines = [
    "# Budget",
    "",
    "> Budget is a free view of UK public finances: receipts, spending, borrowing, debt, gilts and taxpayers. Figures come from ONS, HMRC, HM Treasury, the UK Debt Management Office, the Bank of England and, when the file is available, the OBR. Every chart names its source and release date.",
    "",
    snapshot && borrowing != null && month
      ? `Latest ONS release ${formatRelease(snapshot.releaseDate)}: public sector net borrowing ${formatGbpFromMillions(borrowing)} in ${formatMonth(month)}${ratio == null ? "" : `, public sector net debt ${formatPercent(ratio)} of GDP`}.`
      : "No ONS snapshot is loaded.",
    "",
    "## Pages",
    `- [Overview](${SITE_URL}/)`,
    `- [Receipts](${SITE_URL}/receipts)`,
    `- [Spending](${SITE_URL}/spending)`,
    `- [Borrowing](${SITE_URL}/borrowing)`,
    `- [Debt and gilts](${SITE_URL}/debt)`,
    `- [Taxpayers](${SITE_URL}/taxpayers)`,
    `- [Forecasts](${SITE_URL}/forecasts)`,
    `- [Methodology](${SITE_URL}/methodology)`,
    `- [Data sources](${SITE_URL}/data-sources)`,
    `- [Data health](${SITE_URL}/data-health)`,
    `- [Glossary](${SITE_URL}/glossary)`,
    `- [FAQ](${SITE_URL}/faq)`,
    `- [API](${SITE_URL}/api)`,
    "",
    "## How to cite",
    "Budget (budget.vahaah.com), {page}, data from {publisher named on the page}, retrieved {date}. Upstream licences apply.",
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=300" },
  });
}
