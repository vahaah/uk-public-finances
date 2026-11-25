import { pageIndexLinks } from "@/components/page-index";
import { SECTION_HINT, type CommandItem } from "@/lib/command-match";
import { GLOSSARY } from "@/lib/content";
import { faqAnchor, liveFaq } from "@/lib/faq";
import { latestBudgetNav } from "@/lib/nav-event";
import { shareCard } from "@/lib/share-card";

export type { CommandItem };

/** Pages, glossary, FAQ and the latest headline figures. Built when the palette opens. */
export async function commandIndex(): Promise<CommandItem[]> {
  const [pages, faq, featured] = await Promise.all([pageIndexLinks(), liveFaq(), latestBudgetNav()]);
  const figurePaths = ["/", "/borrowing", "/debt", "/receipts", "/spending", ...(featured ? [featured.href, `${featured.href}/explained`] : [])];
  const cards = await Promise.all(figurePaths.map(async (path) => ({ path, card: await shareCard(path) })));
  const figures: CommandItem[] = cards.flatMap(({ path, card }) =>
    card ? [{ kind: "figure" as const, label: card.sentence, href: path, hint: card.kicker }] : [],
  );
  const pageItems: CommandItem[] = pages.map((page) => ({
    kind: "page",
    label: page.label,
    href: page.href,
    hint: page.href.startsWith("/budgets/") ? "Budget" : SECTION_HINT,
  }));
  const faqItems: CommandItem[] = faq.map((item) => ({
    kind: "faq",
    label: item.question,
    href: `/faq#${faqAnchor(item.question)}`,
    hint: "FAQ",
  }));
  const glossary: CommandItem[] = GLOSSARY.map((entry) => ({
    kind: "glossary",
    label: entry.term,
    href: `/glossary#${entry.id}`,
    hint: "Glossary",
  }));
  return [...figures, ...pageItems, ...faqItems, ...glossary];
}
