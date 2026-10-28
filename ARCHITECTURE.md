# Architecture

```mermaid
flowchart LR
  cron[Vercel Cron UTC] --> gate["shouldRunSlot Europe/London"]
  gate --> wf["one workflow per source"]
  wf --> detect[detect release]
  detect --> download[download]
  download --> parse[parse]
  parse --> zod[zod]
  zod -->|ok| blob["Blob snapshots/{id}/{hash}.json"]
  zod -->|fail| keep[keep last good and write health/{id}.json]
  blob --> revalidate[revalidatePath]
  revalidate --> pages[App Router pages]
  fixtures[fixtures/snapshots] --> pages
  blob --> pages
```

## Stack

Next.js 16.4 App Router, React 19, TypeScript, Tailwind CSS v4, Geist, Recharts 3, nuqs, zod 3, Vitest, Playwright. Workflows use the Workflow SDK (`"use workflow"` / `"use step"`, `withWorkflow` in `next.config.ts`). Snapshots use `@vercel/blob`.

## Sources

| Id | Publisher | What is parsed |
| --- | --- | --- |
| `ons-psf` | ONS time series JSON | J5II, JW2O, KX5Q, JW2T, KSE6, HF6X, CPOA, NMFX, JNYX, JNYY |
| `hmrc-receipts` | HMRC, discovered via GOV.UK | `Receipts_Annually` and `Receipts_Monthly` in the ODS |
| `pesa` | HM Treasury PESA, discovered via GOV.UK | Chapter 4 sheet `4_2`, chapter 6 sheet `6_1` |
| `boe-yields` | Bank of England IADB CSV | `IUDBEDR` Bank Rate, `IUDMNPY` 10-year nominal par yield |
| `hmrc-income-tax` | HMRC income tax liabilities, discovered via GOV.UK | Tables 2.1 and 2.4 |
| `dmo-gilts` | UK DMO `GetSalesData` | Portfolio total, conventional, index-linked, average maturity |
| `obr-databank` | OBR, or `manual/obr-public-finances.xlsx` in Blob | Sheets with an Outturn column and a Forecast column |

GOV.UK search picks the publication. The Content API then supplies the spreadsheet URL. That URL is stored on the snapshot after the fetch. It is not a constant in the workflow.

## Snapshot

`fixtures/snapshots/{id}.json` and Blob `snapshots/{id}/{contentHash}.json` share one envelope: publisher, licence, release date, source URL, and `contentHash` of the data. `snapshots/{id}/latest.json` points at the current object. Pages call `readSnapshot`. With `BLOB_READ_WRITE_TOKEN` they prefer Blob and fall back to the fixture if the object is missing. A Blob object that fails the schema is not rendered; the fixture is kept and `/api/health` reports `validation_failed` with `usingLastGood`.

`/api/health` is `ok` unless a critical source is missing or any source failed validation. OBR and, when empty, a missing DMO file are not critical. Stale data stays `ok` and is flagged `stale`.

## Sign

The September 2026 ONS bulletin says borrowing was £24.5 billion and the financial-year total was £97.8 billion. The J5II download for those periods is −24520 and the April–September sum is −97841. `bulletinSign` stores the negation. Debt interest NMFX is already +10933, matching the bulletin's £10.9 billion, and is not negated. Receipts plus the bulletin borrowing figure equals TME for September 2026 (99271 + 24520 = 123791).

## Routes

`/`, `/receipts`, `/spending`, `/borrowing`, `/debt`, `/taxpayers`, `/forecasts`, `/methodology`, `/data-sources`, `/data-health`, `/glossary`, `/faq`, `/api`. Machine readable: `/api/health`, `/api/snapshots/{id}`, `/llms.txt`, `/sitemap.xml`, `/robots.txt`. FAQ page emits FAQPage JSON-LD. Data pages emit Dataset JSON-LD.

## Cron

`vercel.json` schedules `5 6,7 18-23 * *` for `/api/cron/ons-psf?slot=release` and `30 6,7 * * *` for `/api/cron/daily?slot=daily`. The handler returns 200 when the London clock does not match, so Vercel does not retry the other UTC hour.
