/** Titles stay within 51 characters so the `| Budget` suffix keeps the title tag at 60. Descriptions stay within 155. */
export const TITLE_TAG_MAX = 60;
export const TITLE_SUFFIX = " | Budget";
export const DESCRIPTION_MAX = 155;

export const PAGE_COPY = {
  home: {
    title: "UK budget breakdown: tax, spending, debt",
    description:
      "UK budget breakdown: where the money comes from and where it goes, plus borrowing and the national debt. From the ONS, HMRC and HM Treasury.",
  },
  borrowing: {
    title: "UK government borrowing",
    description: "How much the UK government is borrowing this month and this financial year, from the ONS. Borrowing adds to the national debt.",
  },
  debt: {
    title: "UK national debt and gilt yields",
    description: "UK national debt in pounds and as a share of GDP, debt interest, Bank Rate and gilt yields. From the ONS, the Bank of England and the DMO.",
  },
  receipts: {
    title: "UK tax receipts by tax",
    description: "UK tax receipts by tax: income tax, National Insurance, VAT, corporation tax and the rest. Cash collected by HMRC, by year and by month.",
  },
  spending: {
    title: "What the UK government spends on",
    description: "What the UK government spends money on, including health, welfare, education, defence and debt interest. From HM Treasury.",
  },
  taxpayers: {
    title: "How many people pay UK income tax?",
    description: "How many people pay income tax in the UK, by rate, and the share paid by the top 1% and top 10%. HMRC's projection.",
  },
  forecasts: {
    title: "OBR forecast for UK borrowing",
    description: "The OBR forecast for UK government borrowing this year, set against how much the ONS has recorded so far.",
  },
  budgets: {
    title: "How each UK Budget turned out",
    description: "How each UK Budget's borrowing forecast turned out, from the OBR and the ONS, with the fiscal rules in force at the time.",
  },
  rules: {
    title: "UK fiscal rules and headroom",
    description: "UK fiscal rules since 2010, how long each set lasted, and the headroom the OBR forecast left against them.",
  },
  faq: {
    title: "UK borrowing, debt and tax: FAQ",
    description: "Answers on UK government borrowing, the national debt, tax receipts, debt interest and where the figures come from.",
  },
  dataSources: {
    title: "Data sources and licences",
    description: "Publishers, datasets and licences behind every figure: ONS, HMRC, HM Treasury, the Debt Management Office, the Bank of England and the OBR.",
  },
} as const;

export function clampTitle(title: string): string {
  const max = TITLE_TAG_MAX - TITLE_SUFFIX.length;
  if (title.length <= max) return title;
  const cut = title.slice(0, max).trimEnd();
  const space = cut.lastIndexOf(" ");
  return space > 20 ? cut.slice(0, space) : cut;
}

export function clampDescription(description: string): string {
  const flat = description.replace(/\s+/g, " ").trim();
  if (flat.length <= DESCRIPTION_MAX) return flat;
  const cut = flat.slice(0, DESCRIPTION_MAX - 1);
  const space = cut.lastIndexOf(" ");
  const base = (space > 80 ? cut.slice(0, space) : cut).trimEnd();
  return `${base}…`;
}
