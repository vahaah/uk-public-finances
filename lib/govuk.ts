const SPREADSHEET_TYPES = new Set([
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

export type GovukAttachment = {
  title?: string;
  url?: string;
  content_type?: string;
  filename?: string;
};

export type GovukContent = {
  title?: string;
  base_path?: string;
  public_updated_at?: string;
  details?: { attachments?: GovukAttachment[] };
};

export type GovukSearchHit = {
  title?: string;
  link?: string;
  public_timestamp?: string;
};

export function spreadsheetAttachments(content: GovukContent): GovukAttachment[] {
  return (content.details?.attachments ?? []).filter(
    (attachment) =>
      Boolean(attachment.url) && SPREADSHEET_TYPES.has(attachment.content_type ?? ""),
  );
}

export function pickHmrcReceiptsWorkbook(content: GovukContent): GovukAttachment {
  const sheets = spreadsheetAttachments(content);
  const preferred =
    sheets.find((sheet) => /ns_table/i.test(sheet.filename ?? "")) ?? sheets[0];
  if (!preferred?.url) throw new Error("HMRC receipts content has no spreadsheet attachment");
  return preferred;
}

export function pickPesaChapters(content: GovukContent): { chapter4: GovukAttachment; chapter6: GovukAttachment } {
  const sheets = spreadsheetAttachments(content);
  const chapter4 = sheets.find((sheet) => /chapter[_\s-]*4/i.test(`${sheet.filename} ${sheet.title}`));
  const chapter6 = sheets.find((sheet) => /chapter[_\s-]*6/i.test(`${sheet.filename} ${sheet.title}`));
  if (!chapter4?.url || !chapter6?.url) {
    throw new Error("PESA content is missing chapter 4 or chapter 6");
  }
  return { chapter4, chapter6 };
}

export function pickIncomeTaxWorkbook(content: GovukContent): GovukAttachment {
  const sheets = spreadsheetAttachments(content);
  const preferred =
    sheets.find((sheet) => /collated/i.test(`${sheet.filename} ${sheet.title}`)) ?? sheets[0];
  if (!preferred?.url) throw new Error("Income tax content has no spreadsheet attachment");
  return preferred;
}

export function pickSearchHit(
  hits: GovukSearchHit[],
  test: (hit: GovukSearchHit) => boolean,
): GovukSearchHit {
  const hit = hits.find((candidate) => candidate.link && test(candidate));
  if (!hit?.link) throw new Error("GOV.UK search returned no matching publication");
  return hit;
}
