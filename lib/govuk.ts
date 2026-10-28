const SPREADSHEET_TYPES = new Set([
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

export const GOVUK_PATHS = {
  hmrcReceipts: "/government/statistics/hmrc-tax-and-nics-receipts-for-the-uk",
  pesaPrefix: "/government/statistics/public-expenditure-statistical-analyses-",
  incomeTaxPrefix: "/government/statistics/income-tax-liabilities-statistics-",
} as const;

export type GovukAttachment = {
  title?: string;
  url?: string;
  content_type?: string;
  filename?: string;
};

export type GovukContent = {
  title?: string;
  base_path?: string;
  document_type?: string;
  public_updated_at?: string;
  details?: { attachments?: GovukAttachment[] };
};

export type GovukSearchHit = {
  title?: string;
  link?: string;
  public_timestamp?: string;
  document_type?: string;
};

export function isStatisticsPath(link: string): boolean {
  return link.startsWith("/government/statistics/");
}

export function spreadsheetAttachments(content: GovukContent): GovukAttachment[] {
  return (content.details?.attachments ?? []).filter(
    (attachment) => Boolean(attachment.url) && SPREADSHEET_TYPES.has(attachment.content_type ?? ""),
  );
}

export function pickHmrcReceiptsWorkbook(content: GovukContent): GovukAttachment {
  assertBasePath(content, GOVUK_PATHS.hmrcReceipts);
  const match = spreadsheetAttachments(content).find((sheet) => /ns_table/i.test(sheet.filename ?? ""));
  if (!match?.url) throw new Error("HMRC receipts content has no NS_Table spreadsheet");
  return match;
}

export function pickPesaChapters(content: GovukContent): { chapter4: GovukAttachment; chapter6: GovukAttachment } {
  const base = content.base_path ?? "";
  if (!base.startsWith(GOVUK_PATHS.pesaPrefix)) {
    throw new Error(`PESA content path is not a PESA statistics release: ${base}`);
  }
  const sheets = spreadsheetAttachments(content);
  const chapter4 = sheets.find((sheet) => /chapter[_\s-]*4/i.test(`${sheet.filename ?? ""} ${sheet.title ?? ""}`));
  const chapter6 = sheets.find((sheet) => /chapter[_\s-]*6/i.test(`${sheet.filename ?? ""} ${sheet.title ?? ""}`));
  if (!chapter4?.url || !chapter6?.url) {
    throw new Error("PESA content is missing chapter 4 or chapter 6");
  }
  return { chapter4, chapter6 };
}

export function pickIncomeTaxWorkbook(content: GovukContent): GovukAttachment {
  const base = content.base_path ?? "";
  if (!base.startsWith(GOVUK_PATHS.incomeTaxPrefix)) {
    throw new Error(`Income tax content path is not the liabilities release: ${base}`);
  }
  const match = spreadsheetAttachments(content).find((sheet) => /collated/i.test(`${sheet.filename ?? ""} ${sheet.title ?? ""}`));
  if (!match?.url) throw new Error("Income tax content has no collated spreadsheet");
  return match;
}

export function pickSearchHit(hits: GovukSearchHit[], test: (hit: GovukSearchHit) => boolean): GovukSearchHit {
  const hit = hits.find((candidate) => {
    if (!candidate.link || !isStatisticsPath(candidate.link)) return false;
    return test(candidate);
  });
  if (!hit?.link) throw new Error("GOV.UK search returned no official statistics publication");
  return hit;
}

function assertBasePath(content: GovukContent, expected: string): void {
  if (content.base_path !== expected) {
    throw new Error(`Expected GOV.UK content ${expected}, got ${content.base_path ?? "none"}`);
  }
}
