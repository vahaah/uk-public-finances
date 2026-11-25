import { describe, expect, it } from "vitest";

import { latestBudgetEvent } from "@/lib/nav-event";
import { matchCommand, type CommandItem } from "@/lib/command-match";
import { faqAnchor } from "@/lib/faq";
import {
  borrowingCard,
  cardVersion,
  debtCard,
  eventForecastSentence,
  explainedSentence,
  homeCard,
  receiptsSentence,
  spendingSentence,
} from "@/lib/headlines";
import { DESCRIPTION_MAX, PAGE_COPY, TITLE_SUFFIX, TITLE_TAG_MAX } from "@/lib/page-copy";
import { ogImageUrl, pageMeta } from "@/lib/meta";
import { FAQ } from "@/lib/content";
import { spendingShares } from "@/lib/spending-shares";
import type { FiscalEvent } from "@/lib/budgets/events";

const september = {
  month: "2026-09",
  receiptsMillions: 99271,
  spendingMillions: 123791,
  borrowingMillions: 24520,
};

describe("live headlines", () => {
  it("puts September 2026 receipts, spending and borrowing in one sentence", () => {
    const card = homeCard(september, "2026-10-20T23:00", PAGE_COPY.home.title);
    expect(card?.sentence).toBe("In September 2026 the public sector received £99.3bn, spent £123.8bn and borrowed £24.5bn.");
    expect(card?.title).toBe("UK budget breakdown, September 2026");
    expect(card?.description).toBe(card?.sentence);
    expect(card!.title.length + TITLE_SUFFIX.length).toBeLessThanOrEqual(TITLE_TAG_MAX);
    expect(card!.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it("states borrowing so far this financial year", () => {
    const card = borrowingCard({ year: "2026-27", through: "2026-09" }, 97841, "2026-10-20T23:00", PAGE_COPY.borrowing.title);
    expect(card?.sentence).toBe("Public sector net borrowing so far in 2026-27 (April to September 2026) was £97.8bn.");
    expect(card?.title).toBe("UK borrowing: £97.8bn in 2026-27");
    expect(card!.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
  });

  it("states the debt stock and the share of GDP", () => {
    const card = debtCard("2026-09", 3004964, 94, "2026-10-20T23:00", PAGE_COPY.debt.title);
    expect(card?.sentence).toBe("Public sector net debt was £3,005.0bn at the end of September 2026, 94.0% of GDP.");
    expect(card?.title).toBe("UK debt: £3,005.0bn, 94.0% of GDP");
  });

  it("states HMRC and PESA totals without inventing a personal split", () => {
    expect(receiptsSentence("2025-26", 937763)).toBe("HMRC received £937.8bn in tax and National Insurance in 2025-26.");
    expect(spendingSentence("2025-26", 1227.6, 1360.1)).toBe(
      "In 2025-26, public spending on services was £1,227.6bn and total managed expenditure was £1,360.1bn.",
    );
  });

  it("uses the year-ahead borrowing forecast and the explained sentence", () => {
    expect(eventForecastSentence("Budget 2026", "2027-28", 100)).toBe("At Budget 2026, the OBR forecast borrowing of £100.0bn in 2027-28.");
    expect(eventForecastSentence("Budget 2026", "2027-28", null)).toBeNull();
    expect(
      explainedSentence({
        currentLabel: "October 2026",
        previousLabel: "March 2026",
        fy: "2026-27",
        current: 100,
        previous: 90,
        date: "2026-10-28",
      }),
    ).toBe("The OBR's October 2026 forecast puts UK public sector net borrowing at £100.0bn in 2026-27, compared with £90.0bn in its March 2026 forecast.");
  });

  it("keeps the newest stamp, to 16 characters", () => {
    expect(cardVersion("2026-10-20T23:00:00.000Z", "2026-11-01T00:00:00.000Z")).toBe("2026-11-01T00:00");
  });
});

describe("share card metadata", () => {
  it("puts the live sentence in og:image alt and twitter:image alt, and versions the image URL", () => {
    const meta = pageMeta({
      title: "UK debt: £3,005.0bn, 94.0% of GDP",
      description: "Public sector net debt was £3,005.0bn at the end of September 2026, 94.0% of GDP.",
      path: "/debt",
      og: { alt: "Public sector net debt was £3,005.0bn at the end of September 2026, 94.0% of GDP.", version: "2026-10-20T23:00" },
    });
    const og = meta.openGraph as { images: { url: string; alt: string }[] };
    const twitter = meta.twitter as { images: { url: string; alt: string }[] };
    const url = new URL(og.images[0]!.url);
    expect(url.searchParams.get("p")).toBe("/debt");
    expect(url.searchParams.get("v")).toBe("2026-10-20T23:00");
    expect(og.images[0]?.alt).toBe(twitter.images[0]?.alt);
    expect(og.images[0]?.alt).toContain("£3,005.0bn");
    expect(twitter.images[0]?.url).toBe(og.images[0]?.url);
  });

  it("still names the section when no live sentence is passed", () => {
    const url = new URL(ogImageUrl("/glossary", "Glossary"));
    expect(url.searchParams.get("k")).toBe("Glossary");
    expect(url.searchParams.get("p")).toBe("/glossary");
  });
});

describe("spending shares", () => {
  it("uses the PESA function totals as shares of spending, not of a person's tax", () => {
    const shares = spendingShares(
      [
        { name: "7. Health", value: 257.5 },
        { name: "10. Social protection", value: 407.3 },
      ],
      1227.6,
    );
    expect(shares[0]?.name).toBe("Social protection");
    expect(shares[0]?.share).toBeCloseTo(33.18, 1);
    expect(shares[1]?.name).toBe("Health");
  });
});

describe("command palette index", () => {
  const items: CommandItem[] = [
    { kind: "figure", label: "Borrowed £24.5bn", href: "/", hint: "Overview" },
    { kind: "page", label: "Borrowing", href: "/borrowing", hint: "Section" },
    { kind: "page", label: "Budget 2026", href: "/budgets/2026-10-budget", hint: "Budget" },
    { kind: "faq", label: "Where do my taxes go?", href: "/faq#where-do-my-taxes-go", hint: "FAQ" },
    { kind: "glossary", label: "Public sector net borrowing (PSNB ex)", href: "/glossary#psnb", hint: "Glossary" },
  ];

  it("shows figures and sections before a query, then matches the rest", () => {
    expect(items.filter((item) => matchCommand(item, "")).map((item) => item.label)).toEqual(["Borrowed £24.5bn", "Borrowing"]);
    expect(items.filter((item) => matchCommand(item, "taxes")).map((item) => item.kind)).toEqual(["faq"]);
    expect(items.filter((item) => matchCommand(item, "psnb")).map((item) => item.kind)).toEqual(["glossary"]);
    expect(faqAnchor("Where do my taxes go?")).toBe("where-do-my-taxes-go");
    expect(faqAnchor("What did Budget 2026 change?")).toBe("what-did-budget-2026-change");
  });
});

describe("FAQ entries", () => {
  const questions = FAQ.map((item) => item.question);

  it("says what Budget does not calculate, and points at HMRC and GOV.UK", () => {
    expect(questions).toEqual(expect.arrayContaining(["Where do my taxes go?", "How much tax do I pay?", "What did the latest Budget change?", "Who gains and loses from the Budget?"]));
    const tax = FAQ.find((item) => item.question === "How much tax do I pay?");
    const goes = FAQ.find((item) => item.question === "Where do my taxes go?");
    expect(tax?.answer).toContain("does not calculate");
    expect(tax?.links?.map((link) => link.href)).toEqual(expect.arrayContaining(["https://www.gov.uk/estimate-income-tax", "https://www.gov.uk/guidance/annual-tax-summary"]));
    expect(goes?.answer.toLowerCase()).toContain("not earmarked");
    expect(JSON.stringify(FAQ)).not.toMatch(/Resolution Foundation|Institute for Fiscal Studies|\bIFS\b/i);
  });
});

describe("latest budget nav", () => {
  it("uses the newest budget, not a forecast-only outlook", () => {
    const events = [
      event("2026-03-01", "forecast-only", "Spring Forecast 2026"),
      event("2026-10-28", "budget", "Budget 2026"),
      event("2024-10-30", "budget", "Autumn Budget 2024"),
    ];
    expect(latestBudgetEvent(events)?.name).toBe("Budget 2026");
  });
});

function event(date: string, type: FiscalEvent["type"], name: string): FiscalEvent {
  return {
    slug: date,
    date,
    name,
    shortName: null,
    type,
    chancellor: "A Chancellor",
    government: "A government",
    obrForecast: "yes",
    weight: "full",
    govukPath: null,
    dateStatus: "verified",
    status: "listed",
    observedDate: null,
  };
}
