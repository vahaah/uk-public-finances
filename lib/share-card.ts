import { eventLabel, financialYearOf } from "@/lib/budgets/events";
import { loadYearAhead } from "@/lib/budgets/year-ahead";
import { storyEvents } from "@/lib/story";
import {
  borrowingCard,
  cardVersion,
  debtCard,
  eventCard,
  explainedCard,
  explainedSentence,
  homeCard,
  receiptsCard,
  spendingCard,
  type ShareCopy,
} from "@/lib/headlines";
import { PAGE_COPY } from "@/lib/page-copy";
import { readSnapshot, takeSnapshot } from "@/lib/store";

/**
 * Live sentence for a page, from the snapshot that page already shows.
 * The /og route and generateMetadata both use this, so the card and its alt match.
 */
export async function shareCard(path: string): Promise<ShareCopy | null> {
  if (path === "/") return homeShare();
  if (path === "/borrowing") return borrowingShare();
  if (path === "/debt") return debtShare();
  if (path === "/receipts") return receiptsShare();
  if (path === "/spending") return spendingShare();
  const explained = /^\/budgets\/([^/]+)\/explained$/.exec(path);
  if (explained) return explainedShare(explained[1] ?? "");
  const event = /^\/budgets\/([^/]+)$/.exec(path);
  if (event && event[1] !== "rules") return eventShare(event[1] ?? "");
  return null;
}

async function homeShare(): Promise<ShareCopy | null> {
  const ons = takeSnapshot("ons-psf", (await readSnapshot("ons-psf")).snapshot);
  const month = ons?.data.series.j5ii?.latest?.period;
  const receipts = ons?.data.series.jw2o?.latest?.value;
  const spending = ons?.data.series.kx5q?.latest?.value;
  const borrowing = ons?.data.bulletinSign.borrowingLatest;
  if (!ons || !month || receipts == null || spending == null || borrowing == null) return null;
  return homeCard(
    { month, receiptsMillions: receipts, spendingMillions: spending, borrowingMillions: borrowing },
    cardVersion(ons.releaseDate, ons.retrievedAt),
    PAGE_COPY.home.title,
  );
}

async function borrowingShare(): Promise<ShareCopy | null> {
  const ons = takeSnapshot("ons-psf", (await readSnapshot("ons-psf")).snapshot);
  if (!ons) return null;
  return borrowingCard(
    ons.data.financialYear,
    ons.data.bulletinSign.financialYearBorrowing,
    cardVersion(ons.releaseDate, ons.retrievedAt),
    PAGE_COPY.borrowing.title,
  );
}

async function debtShare(): Promise<ShareCopy | null> {
  const ons = takeSnapshot("ons-psf", (await readSnapshot("ons-psf")).snapshot);
  if (!ons) return null;
  return debtCard(
    ons.data.series.kse6?.latest?.period ?? null,
    ons.data.series.kse6?.latest?.value ?? null,
    ons.data.series.hf6x?.latest?.value ?? null,
    cardVersion(ons.releaseDate, ons.retrievedAt),
    PAGE_COPY.debt.title,
  );
}

async function receiptsShare(): Promise<ShareCopy | null> {
  const hmrc = takeSnapshot("hmrc-receipts", (await readSnapshot("hmrc-receipts")).snapshot);
  if (!hmrc) return null;
  return receiptsCard(hmrc.data.annual.year, hmrc.data.annual.total, cardVersion(hmrc.releaseDate, hmrc.retrievedAt));
}

async function spendingShare(): Promise<ShareCopy | null> {
  const pesa = takeSnapshot("pesa", (await readSnapshot("pesa")).snapshot);
  if (!pesa) return null;
  return spendingCard(
    pesa.data.functions.year,
    pesa.data.functions.totalServices,
    pesa.data.functions.totalManagedExpenditure,
    cardVersion(pesa.releaseDate, pesa.retrievedAt),
  );
}

async function eventShare(slug: string): Promise<ShareCopy | null> {
  const event = (await storyEvents()).find((item) => item.slug === slug);
  if (!event) return null;
  const { borrowing, versionStamp } = await loadYearAhead(event);
  return eventCard(eventLabel(event), borrowing?.fy ?? null, borrowing?.forecast ?? null, cardVersion(versionStamp));
}

async function explainedShare(slug: string): Promise<ShareCopy | null> {
  const obr = takeSnapshot("budgets-obr", (await readSnapshot("budgets-obr")).snapshot);
  const efo = obr?.data.efo?.data;
  if (!efo?.eventDate) return null;
  const event = (await storyEvents()).find((item) => item.slug === slug && item.date === efo.eventDate);
  if (!event) return null;
  const fy = financialYearOf(event.date);
  const point = efo.psnb?.points.find((item) => item.period === fy);
  const sentence = explainedSentence({
    currentLabel: efo.currentLabel,
    previousLabel: efo.previousLabel,
    fy,
    current: point?.current ?? null,
    previous: point?.previous ?? null,
    date: event.date,
  });
  return explainedCard(eventLabel(event), sentence, cardVersion(obr?.releaseDate, obr?.retrievedAt, event.date));
}
