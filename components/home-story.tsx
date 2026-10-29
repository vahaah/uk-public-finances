import Link from "next/link";

import { Sparkline, trendWords } from "@/components/blocks";
import { formatUnit } from "@/lib/story-format";
import { eventLabel, financialYearOf } from "@/lib/budgets/events";
import { latestStory } from "@/lib/story";

/** "What is happening in the UK": four findings from the latest OBR forecast, each a step in the story. */
export async function HomeStory() {
  const story = await latestStory();
  if (!story) return null;
  const { efo, event } = story;
  const fy = financialYearOf(event.date);
  const label = eventLabel(event);
  const base = `/budgets/${event.slug}/explained`;
  const rolling = efo.rhdiRolling.filter((point) => point.period >= "1990");
  const rollingNow = efo.rhdiRolling.find((point) => point.period === fy);
  const psnbLine = (efo.psnb?.points ?? []).flatMap((point) => (point.current == null ? [] : [point.current]));
  const psnb = efo.psnb?.points.find((point) => point.period === fy);
  const interest = efo.debtInterest?.points.flatMap((point) => (point.current == null ? [] : [{ period: point.period, value: point.current }])) ?? [];
  const interestLong = interest.filter((point) => point.period >= "1990");
  const tax = [...(efo.taxBurden?.outturn ?? []), ...(efo.taxBurden?.points.flatMap((point) => (point.current == null || (efo.taxBurden?.outturn ?? []).some((past) => past.period === point.period) ? [] : [{ period: point.period, value: point.current }])) ?? [])].filter((point) => point.period >= "1990");
  const interestNow = interest.find((point) => point.period === fy);
  const lastHigher = interestNow ? interest.filter((point) => point.period < fy && point.value >= interestNow.value).at(-1) : undefined;
  const outturnMax = Math.max(...(efo.taxBurden?.outturn ?? []).map((point) => point.value));
  const taxRecord = (tax.at(-1)?.value ?? 0) > outturnMax;
  const cards = [
    {
      href: `${base}#squeeze`,
      step: "The squeeze",
      value: rollingNow ? formatUnit(rollingNow.value, "pct") : "n/a",
      text: `Average yearly growth in real household income per person over the ten years to ${fy}.`,
      values: rolling.map((point) => point.value),
      label: `Ten-year average growth in real household income per person since 1990. ${trendWords(rolling.map((p) => p.value), (v) => formatUnit(v, "pct"), "1990 to the forecast")}`,
    },
    {
      href: `${base}#trap`,
      step: "More borrowing",
      value: psnb ? formatUnit(psnb.current, "bn") : "n/a",
      text: psnb ? `Borrowing forecast for ${fy}, up from ${formatUnit(psnb.previous, "bn")} in ${efo.psnb?.previousLabel}.` : "Borrowing forecast.",
      values: psnbLine,
      label: `Borrowing forecast by year. ${trendWords(psnbLine, (v) => formatUnit(v, "bn"), "the forecast")}`,
    },
    {
      href: `${base}#trap`,
      step: "Interest bill",
      value: interestNow ? formatUnit(interestNow.value, "pctGdp") : "n/a",
      text: lastHigher ? `Debt interest in ${fy} as a share of GDP, the highest since ${lastHigher.period}.` : `Debt interest in ${fy} as a share of GDP.`,
      values: interestLong.map((point) => point.value),
      label: `Debt interest as a share of GDP since 1990. ${trendWords(interestLong.map((p) => p.value), (v) => formatUnit(v, "pctGdp"), "1990 to the forecast")}`,
    },
    {
      href: `${base}#strategy`,
      step: taxRecord ? "Record taxes" : "Taxes",
      value: tax.at(-1) ? formatUnit(tax.at(-1)!.value, "pctGdp") : "n/a",
      text: `Taxes forecast for ${tax.at(-1)?.period ?? "the end of the forecast"}${taxRecord ? ", higher than any year in the OBR series back to 1948-49" : ""}.`,
      values: tax.map((point) => point.value),
      label: `National Accounts taxes as a share of GDP since 1990. ${trendWords(tax.map((p) => p.value), (v) => formatUnit(v, "pctGdp"), "1990 to the forecast")}`,
    },
  ];
  return (
    <section className="mt-4 border border-neutral-200 p-6 dark:border-neutral-800" aria-labelledby="home-story">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="home-story" className="text-xl font-semibold tracking-tight">What is happening in the UK</h2>
        <Link className="text-sm underline decoration-neutral-400 underline-offset-4" href={base}>
          {label} explained →
        </Link>
      </div>
      <p className="mt-1 max-w-[68ch] text-neutral-900 dark:text-neutral-100">
        Incomes are barely growing, so tax revenue is weaker and borrowing is higher. More debt costs more interest, and the plan is to close the gap with higher taxes later. Figures are from
        the OBR&apos;s {efo.currentLabel} forecast.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.step} href={card.href} className="flex flex-col border border-neutral-200 p-4 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-950">
            <span className="text-sm text-neutral-800 dark:text-neutral-200">{card.step}</span>
            <span className="mt-1 text-2xl font-semibold tabular-nums">{card.value}</span>
            <Sparkline values={card.values} limit={80} label={card.label} className="mt-3" />
            <span className="mt-2 text-sm leading-6 text-neutral-800 dark:text-neutral-200">{card.text}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
