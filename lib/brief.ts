import {
  formatBillions,
  formatDateLong,
  formatGbpFromMillions,
  formatMonthLong,
  formatPercent,
  formatRelease,
} from "@/lib/format";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { DERIVED_LICENCE, SITE_URL } from "@/lib/site";

export async function renderLlms(full: boolean): Promise<string> {
  const [onsLoaded, hmrcLoaded, pesaLoaded, taxLoaded, boeLoaded] = await Promise.all([
    readSnapshot("ons-psf"),
    readSnapshot("hmrc-receipts"),
    readSnapshot("pesa"),
    readSnapshot("hmrc-income-tax"),
    readSnapshot("boe-yields"),
  ]);
  const ons = takeSnapshot("ons-psf", onsLoaded.snapshot);
  const hmrc = takeSnapshot("hmrc-receipts", hmrcLoaded.snapshot);
  const pesa = takeSnapshot("pesa", pesaLoaded.snapshot);
  const tax = takeSnapshot("hmrc-income-tax", taxLoaded.snapshot);
  const boe = takeSnapshot("boe-yields", boeLoaded.snapshot);

  const latest: string[] = [];
  if (ons) {
    const month = ons.data.series.j5ii?.latest?.period;
    const borrowing = ons.data.bulletinSign.borrowingLatest;
    const year = ons.data.bulletinSign.financialYearBorrowing;
    const previous = ons.data.bulletinSign.previousFinancialYearBorrowing;
    const debt = ons.data.series.kse6?.latest?.value;
    const ratio = ons.data.series.hf6x?.latest?.value;
    const interest = ons.data.series.nmfx?.latest?.value;
    if (borrowing != null && month) {
      const yearBit =
        year != null && ons.data.financialYear
          ? `; ${formatGbpFromMillions(year)} in ${ons.data.financialYear.year} to ${formatMonthLong(ons.data.financialYear.through)}${previous == null ? "" : ` (${formatGbpFromMillions(previous)} a year earlier)`}`
          : "";
      latest.push(
        `- Public sector net borrowing: ${formatGbpFromMillions(borrowing)} in ${formatMonthLong(month)}${yearBit}. ONS, published ${formatDateLong(ons.releaseDate)}. Next release ${ons.data.series.j5ii?.nextRelease || "not stated"}.`,
      );
    }
    if (debt != null && ratio != null && month) {
      latest.push(
        `- Public sector net debt excluding public sector banks: ${formatGbpFromMillions(debt)} at end ${formatMonthLong(month)}, ${formatPercent(ratio)} of GDP. The ONS bulletin marks the latest month as provisional.`,
      );
    }
    if (interest != null && month) {
      latest.push(
        `- Central government net interest payable: ${formatGbpFromMillions(interest)} in ${formatMonthLong(month)}. ONS series NMFX, including the capital uplift on index-linked gilts.`,
      );
    }
  } else {
    latest.push("- Latest ONS figures are not available.");
  }
  if (hmrc) {
    latest.push(
      `- HMRC receipts: ${formatGbpFromMillions(hmrc.data.annual.total)} in ${hmrc.data.annual.year} (cash HMRC received, not the ONS accrued total).`,
    );
  }
  if (pesa) {
    const services = pesa.data.functions.totalServices;
    const tme = pesa.data.functions.totalManagedExpenditure;
    latest.push(
      `- Spending on services: ${services == null ? "not available" : formatBillions(services)} in ${pesa.data.functions.year}; total managed expenditure ${tme == null ? "not available" : formatBillions(tme)}. HM Treasury PESA table 4.2 and table 4.1.`,
    );
  }
  if (tax?.data.payers.total != null) {
    const millions = tax.data.payers.total / 1000;
    const share = tax.data.shares.top1Percent;
    latest.push(
      `- Income tax payers: ${millions.toLocaleString("en-GB", { maximumFractionDigits: 1 })} million in ${tax.data.payers.yearLabel}${tax.data.payers.projected ? " (HMRC projection)" : ""}${share == null ? "" : `; top 1% pay ${formatPercent(share)} of income tax`}.`,
    );
  }
  if (boe) {
    const bank = boe.data.series.IUDBEDR.latest;
    const gilt = boe.data.series.IUDMNPY.latest;
    if (bank && gilt) {
      latest.push(
        `- Bank Rate ${formatPercent(bank.value, 2)} (${formatRelease(bank.date)}); 10-year nominal par gilt yield ${formatPercent(gilt.value, 2)} (${formatRelease(gilt.date)}). Bank of England.`,
      );
    }
  }

  const pages = [
    `- [Overview](${SITE_URL}/): headline borrowing, receipts, spending, debt and central government net interest from the latest ONS release.`,
    `- [Tax and receipts](${SITE_URL}/receipts): HMRC receipts by tax.`,
    `- [Spending](${SITE_URL}/spending): PESA spending by function and departmental expenditure limits.`,
    `- [Borrowing](${SITE_URL}/borrowing): monthly public sector net borrowing and the financial year to date.`,
    `- [Debt and gilts](${SITE_URL}/debt): public sector net debt, the debt ratio, central government net interest, Bank Rate, gilt yields and the DMO portfolio.`,
    `- [Income taxpayers](${SITE_URL}/taxpayers): payers by band and the top 1% and top 10% shares.`,
    `- [Forecasts](${SITE_URL}/forecasts): ONS outturn. Forecast vintage: pending.`,
    `- [Old money vs new](${SITE_URL}/old-money): revalue an amount with MNF2, L8GG, CPI, CPIH or RPI.`,
    `- [Glossary](${SITE_URL}/glossary)`,
    `- [FAQ](${SITE_URL}/faq)`,
    `- [Methodology](${SITE_URL}/methodology): how files are checked, and how ONS borrowing is presented.`,
    `- [Data sources and licences](${SITE_URL}/data-sources)`,
  ];

  const lines = [
    "# Budget: UK public finances",
    "",
    `> Budget (${SITE_URL}) shows UK public finances from official statistics: receipts, spending, borrowing, debt, gilts and income taxpayers. Figures come from the ONS, HMRC, HM Treasury, the UK Debt Management Office, the Bank of England and, when a file is loaded, the OBR. Every chart names its publisher and publication date. It is independent and not a government site. ONS, HMRC, HM Treasury and OBR statistics are under the Open Government Licence v3.0. Bank of England and Debt Management Office figures keep their own terms. Sums, shares and the borrowing presentation on this site are ${DERIVED_LICENCE}. ${SITE_URL}/data-sources`,
    "",
    "## Latest figures",
    ...latest,
    "",
    "## Pages",
    ...pages,
    "",
    "## Data (JSON)",
    ...["ons-psf", "hmrc-receipts", "pesa", "hmrc-income-tax", "dmo-gilts", "boe-yields"].map(
      (id) => `- ${SITE_URL}/api/snapshots/${id}`,
    ),
    "",
    "## Notes for answers",
    "- How borrowing and the current budget deficit are presented is explained once, on the methodology page. Do not invent a sign.",
    "- ONS current receipts (accrued, whole public sector) and HMRC receipts (cash received by HMRC) are different measures. Name which one you quote.",
    "- UK financial years run from 1 April to 31 March. Income tax uses the tax year, from 6 April to 5 April. HMRC 2026-27 taxpayer figures are a projection.",
    "- Central government net interest payable (ONS series NMFX) includes the capital uplift on index-linked gilts. It is not the whole public sector debt interest bill.",
    "- The gilt portfolio totals are unscaled: the DMO feed does not state a unit. The index-linked share is the ratio of the two published fields.",
    "- The OBR forecast vintage is pending until a databank file is loaded. Do not quote a forecast from this site.",
    "- Real terms use the GDP deflator: calendar years are ONS series MNF2 and financial years are the average of L8GG quarters. Shares of GDP use BKTL. CPI is D7BT, CPIH is L522, RPI is CHAW. Do not fill a year the index does not publish.",
    "- Attribute a figure to its publisher (for example \"ONS, via Budget\"), and credit this site for a derived figure.",
    "",
    "## How to cite",
    "{Publisher}, {dataset}, via Budget (budget.vahaah.com/{page}), accessed {date}. The publisher's licence applies. Derived figures are CC BY 4.0.",
    "",
  ];

  if (full && ons) {
    lines.push(
      "## Series titles in the latest ONS file",
      ...Object.values(ons.data.series).map((series) => `- ${series.cdid}: ${series.title}`),
      "",
    );
  }

  return lines.join("\n");
}
