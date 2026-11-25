import { eventLabel } from "@/lib/budgets/events";
import { loadYearAhead } from "@/lib/budgets/year-ahead";
import { FAQ, type FaqItem } from "@/lib/content";
import { forecastFor, vintageLabel } from "@/lib/forecasts-view";
import { formatBillions, formatDateLong, formatGbpFromMillions, formatMonthLong, formatPercent } from "@/lib/format";
import { latestBudgetEvent } from "@/lib/nav-event";
import { storyEvents } from "@/lib/story";
import { readSnapshot, takeSnapshot } from "@/lib/store";

export const HMRC_TAX_SUMMARY = "https://www.gov.uk/guidance/annual-tax-summary";
export const GOVUK_TAX_CALCULATOR = "https://www.gov.uk/estimate-income-tax";

const PERSONAL = new Set([
  "Where do my taxes go?",
  "How much tax do I pay?",
  "What did the latest Budget change?",
  "Who gains and loses from the Budget?",
]);

export function faqAnchor(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

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
  const budget = await budgetFaq();
  const personal = FAQ.filter((item) => PERSONAL.has(item.question)).map((item) => budget[item.question] ?? item);
  const rest = FAQ.slice(2)
    .filter((item) => !PERSONAL.has(item.question))
    .map((item) => (item.question === "Why are there no OBR forecasts?" ? { ...item, question: "What does the OBR forecast for borrowing?" } : item));
  const items: FaqItem[] = [
    ...FAQ.slice(0, 2),
    { question: "How much does the UK spend on debt interest?", answer: "", links: [{ href: "/debt", label: "Debt and gilts" }] },
    { question: "How much tax does the UK collect?", answer: "", links: [{ href: "/receipts", label: "Tax and receipts" }] },
    ...personal,
    ...rest,
  ];
  return items
    .map((item) => ({ ...item, answer: answers[item.question] ?? item.answer }))
    .filter((item) => item.answer.length > 0);
}

/** Latest Budget questions, with links that follow the event in the registry. */
async function budgetFaq(): Promise<Record<string, FaqItem>> {
  const [events, obrLoaded] = await Promise.all([storyEvents(), readSnapshot("budgets-obr")]);
  const event = latestBudgetEvent(events);
  if (!event) return {};
  const label = eventLabel(event);
  const obr = takeSnapshot("budgets-obr", obrLoaded.snapshot);
  const { borrowing } = await loadYearAhead(event);
  const efo = obr?.data.efo?.data;
  const explained = efo?.eventDate === event.date;
  const charts = obr?.data.distributional?.data?.eventSlug === event.slug;
  const forecast =
    borrowing?.forecast != null ? ` The OBR forecast borrowing of ${formatBillions(borrowing.forecast)} in ${borrowing.fy}, the year ahead.` : "";
  const links = [
    { href: `/budgets/${event.slug}`, label },
    ...(explained ? [{ href: `/budgets/${event.slug}/explained#reality`, label: "Explained, chapter 4" }] : []),
    ...(charts ? [{ href: `/budgets/${event.slug}#households-by-income`, label: "HM Treasury distributional charts" }] : []),
    { href: "/spending", label: "Spending" },
    { href: "/taxpayers", label: "Income taxpayers" },
  ];
  const chartsSentence = charts
    ? ` HM Treasury's distributional charts on the ${label} page estimate the effect on households by income.`
    : "";
  const chapterSentence = explained ? " Chapter 4 of the explained page sets the measures out." : "";
  return {
    "What did the latest Budget change?": {
      question: `What did ${label} change?`,
      answer: `${label} is the latest Budget on this site.${forecast} The event page lists the measures the OBR scored.${chapterSentence}${chartsSentence} Budget does not calculate what changed for one person.`,
      links,
    },
    "Who gains and loses from the Budget?": {
      question: "Who gains and loses from the Budget?",
      answer: `Budget does not say who gains or loses from ${label}.${charts ? ` HM Treasury's distributional analysis estimates the effect on households by income decile, and those charts are on the ${label} page.` : " HM Treasury publishes a distributional analysis with the Budget."} Spending by function and the number of income taxpayers are on their own pages.`,
      links,
    },
  };
}
