export type CommandKind = "figure" | "page" | "faq" | "glossary";

export type CommandItem = {
  kind: CommandKind;
  label: string;
  href: string;
  hint: string;
};

const SECTION_HINT = "Section";

/** Empty query shows the latest figures and the section pages. A query matches the label and the hint. */
export function matchCommand(item: CommandItem, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return item.kind === "figure" || item.hint === SECTION_HINT;
  return `${item.label} ${item.hint}`.toLowerCase().includes(needle);
}

export { SECTION_HINT };
