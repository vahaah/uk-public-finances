# Architecture

```mermaid
flowchart LR
  cron[Vercel Cron UTC] --> gate["evaluateSlot Europe/London window"]
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

`fixtures/snapshots/{id}.json` and Blob `snapshots/{id}/{contentHash}.json` share one envelope: publisher, licence, release date, source URL, and `contentHash` of the data. `snapshots/{id}/latest.json` points at the current object. `latest.json` and `health/*.json` are written with `cacheControlMaxAge: 60`. Page reads use `fetch` with `next.revalidate` of 60 seconds so an ISR route stays static. The cron route still reads its marker with `cache: "no-store"`. Pages call `readSnapshot`. With `BLOB_READ_WRITE_TOKEN` they prefer the latest Blob object. If it fails the schema, the newest earlier version that validates is used. The fixture is used only when no Blob version validates. `/api/health` then reports `validation_failed` with `usingLastGood`. A new extract that drops more than 20% of the previous row count is rejected the same way.

`/api/health` is `ok` unless a critical source is missing or any source failed validation. OBR and, when empty, a missing DMO file are not critical. Stale data stays `ok` and is flagged `stale`.

## Sign

The September 2026 ONS bulletin says borrowing was £24.5 billion and the financial-year total was £97.8 billion. The J5II download for those periods is −24520 and the April–September sum is −97841. `bulletinSign` stores the negation. Debt interest NMFX is already +10933, matching the bulletin's £10.9 billion, and is not negated. Receipts plus the bulletin borrowing figure equals TME for September 2026 (99271 + 24520 = 123791).

## Routes

`/`, `/receipts`, `/spending`, `/borrowing`, `/debt`, `/taxpayers`, `/forecasts`, `/methodology`, `/data-sources`, `/data-health`, `/glossary`, `/faq`, `/api`. `/data-health`, `/api` and the 404 are `noindex`. Machine readable: `/api/health`, `/api/snapshots`, `/api/snapshots/{id}`, `/llms.txt`, `/llms-full.txt`, `/sitemap.xml`, `/robots.txt`. FAQ page emits FAQPage JSON-LD. Data pages emit Dataset JSON-LD. Derived figures are CC BY 4.0.

## Cron

`vercel.json` schedules `5 6,7 18-23 * *` for `/api/cron/ons-psf?slot=release` and `30 6,7 * * *` for `/api/cron/daily?slot=daily`. `evaluateSlot` accepts a 20-minute window, dedupes by London date and slot, and a skip response always includes `reason`. The daily route starts every workflow with `Promise.allSettled`.
