# Budget

Open UK public finances for [budget.vahaah.com](https://budget.vahaah.com). Receipts, spending, borrowing, debt, gilts and taxpayers, taken from the publishers' own files.

The site renders committed snapshots captured on 28 October 2026. A Vercel cron starts one Workflow per source, which writes a new snapshot to Blob only after zod accepts it. A failed file keeps the newest earlier Blob version that still validates, then the fixture, and shows up on `/api/health`. Derived figures are CC BY 4.0. Upstream statistics keep the publisher's licence.

```bash
npm install
npm run dev
npm test
npm run publish-check
```

## Env

| Name | Purpose |
| --- | --- |
| `CRON_SECRET` | Bearer token Vercel Cron sends. Required for `/api/cron/*`. |
| `BLOB_READ_WRITE_TOKEN` | Snapshot store. Without it, pages read `fixtures/snapshots`. |
| `INDEXNOW_KEY` | Public IndexNow key, served at `/{key}.txt`. |
| `INDEXNOW_HOST` | Defaults to `budget.vahaah.com`. |

OBR fallback upload, when `obr.uk` returns 403:

```bash
vercel blob put manual/obr-public-finances.xlsx ./public-finances-databank.xlsx --allow-overwrite
```

Do not deploy from this repo's automation. Wire the project in Vercel separately.

## What is live in the snapshots

ONS public sector finances (September 2026 release), HMRC receipts, PESA 2026 chapters 4 and 6, Bank of England Bank Rate and the 10-year par yield, HMRC income tax tables 2.1 and 2.4, and the DMO portfolio totals from `GetSalesData`.

## What is not in the snapshots

- OBR forecasts. `obr.uk` returned a Cloudflare challenge. The workflow tries again from Vercel and otherwise reads the manual Blob workbook. The forecasts page shows ONS outturn only until then.
- Gilt maturity ladder. Report D1A's export URL was blocked by the DMO bot check from this environment. The portfolio total, conventional/index-linked split and average maturity are in the snapshot. The workflow still requests `GetSalesData` on each run.

J5II and JW2T are negative in the ONS download when the bulletin says borrowing or a deficit. Charts use the negation. See [ARCHITECTURE.md](ARCHITECTURE.md).
