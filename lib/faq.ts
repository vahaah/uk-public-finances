import { FAQ, type FaqItem } from "@/lib/content";
import { forecastFor, vintageLabel } from "@/lib/forecasts-view";
import { formatBillions, formatDateLong, formatGbpFromMillions, formatMonthLong, formatPercent } from "@/lib/format";
import { readSnapshot, takeSnapshot } from "@/lib/store";

/**
 * FAQ answers that lead with the latest figure, so search engines and AI tools can quote them.
 * Each answer falls back to the static wording in lib/content.ts when a source is missing.
 */
export async function liveFaq(): Promise<FaqItem[]> {
  const [onsLoaded, hmrcLoaded, obrLoaded] = await Promise.all([readSnapshot("ons-psf"), readSnapshot("hmrc-receipts"), readSnapshot("obr-databank")]);
  const ons = takeSnapshot("ons-psf", onsLoaded.snapshot);
  const hmrc = takeSnapshot("hmrc-receipts", hmrcLoaded.snapshot);
  const obr = takeSnapshot("obr-databank", obrLoaded.snapshot);
  const answers: Record<string, string> = {};
  const released = ons ? `ONS, published ${formatDateLong(ons.releaseDate)}` : "";
  const month = ons?.data.series.j5ii?.latest?.period;
  const borrowing = ons?.data.bulletinSign.borrowingLatest;
  if (ons && month && borrowing != null) {
    const year = ons.data.bulletinSign.financialYearBorrowing;
    const previous = ons.data.bulletinSign.previousFinancialYearBorrowing;
    const fy = ons.data.financialYear;
    const ytd =
      year != null && fy
        ? ` and ${formatGbpFromMillions(year)} in ${fy.year} so far (April to ${formatMonthLong(fy.through)})${previous == null ? "" : `, against ${formatGbpFromMillions(previous)} a year earlier`}`
        : "";
    answers["How much is the UK borrowing?"] = `UK public sector net borrowing was ${formatGbpFromMillions(borrowing)} in ${formatMonthLong(month)}${ytd} (${released}). The latest month is provisional and may be revised.`;
  }
  const debt = ons?.data.series.kse6?.latest?.value;
  const ratio = ons?.data.series.hf6x?.latest?.value;
  if (ons && month && debt != null && ratio != null) {
    answers["How much is the UK national debt?"] = `UK public sector net debt excluding public sector banks was ${formatGbpFromMillions(debt)} at the end of ${formatMonthLong(month)}, ${formatPercent(ratio)} of GDP (${released}). The latest month is provisional and may be revised.`;
  }
  const interest = ons?.data.series.nmfx?.latest?.value;
  if (ons && month && interest != null) {
    answers["How much does the UK spend on debt interest?"] = `Central government net interest payable was ${formatGbpFromMillions(interest)} in ${formatMonthLong(month)} (${released}, series NMFX). It includes the capital uplift on index-linked gilts, so it moves with RPI inflation.`;
  }
  if (hmrc) {
    answers["How much tax does the UK collect?"] = `HMRC received ${formatGbpFromMillions(hmrc.data.annual.total)} in tax and National Insurance in ${hmrc.data.annual.year} (HMRC, cash receipts). The ONS whole-public-sector total of current receipts is larger, because it includes non-HMRC receipts and counts tax when it is due.`;
  }
  const vintage = vintageLabel(obr?.data.round ?? null);
  const psnb = obr?.data.series.find((item) => /net borrowing/i.test(item.name));
  const fyNow = ons?.data.financialYear?.year;
  const forecast = fyNow ? forecastFor(psnb, fyNow) : null;
  if (vintage && fyNow && forecast != null) {
    answers["What does the OBR forecast for borrowing?"] = `The OBR's ${vintage} forecast UK public sector net borrowing of ${formatBillions(forecast)} in ${fyNow}. The forecasts page tracks borrowing so far this year against it.`;
  }
  const items: FaqItem[] = [
    ...FAQ.slice(0, 2),
    { question: "How much does the UK spend on debt interest?", answer: "", links: [{ href: "/debt", label: "Debt and gilts" }] },
    { question: "How much tax does the UK collect?", answer: "", links: [{ href: "/receipts", label: "Tax and receipts" }] },
    ...FAQ.slice(2).map((item) => (item.question === "Why are there no OBR forecasts?" ? { ...item, question: "What does the OBR forecast for borrowing?" } : item)),
  ];
  return items
    .map((item) => ({ ...item, answer: answers[item.question] ?? item.answer }))
    .filter((item) => item.answer.length > 0);
}
