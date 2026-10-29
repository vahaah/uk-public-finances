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

Story charts (`/budgets/<event>/explained`, the long-run charts on topic pages, and the home page "What is happening in the UK" panel) come from the latest EFO "charts and tables" workbooks and the latest Forecast evaluation report charts workbook. After each EFO, upload them under `manual/obr/efo/` (any names, `.xlsx`) and replace the previous event's files. Sheets are matched by chart title, so renumbered charts still load. Then force the daily cron.

```bash
for f in efo-*-charts-and-tables-{executive-summary,chapter-2,chapter-3,chapter-4,chapter-5,chapter-6}.xlsx Forecast-evaluation-report-*-charts-and-tables.xlsx; do
  vercel blob put "manual/obr/efo/$f" "./$f" --allow-overwrite
done
```

Preview locally from files on disk: `npx tsx scripts/obr-local-snapshot.ts out.json historical=… measures=… evaluation=… efo=… efo=…`.

Do not deploy from this repo's automation. Wire the project in Vercel separately.

## What is live in the snapshots

ONS public sector finances (September 2026 release), HMRC receipts, PESA 2026 chapters 4 and 6, Bank of England Bank Rate and the 10-year par yield, HMRC income tax tables 2.1 and 2.4, and the DMO portfolio totals from `GetSalesData`.

## What is not in the snapshots

- OBR forecasts. `obr.uk` returned a Cloudflare challenge. The workflow tries again from Vercel and otherwise reads the manual Blob workbook. The forecasts page shows ONS outturn only until then.
- Gilt maturity ladder. Report D1A's export URL was blocked by the DMO bot check from this environment. The portfolio total, conventional/index-linked split and average maturity are in the snapshot. The workflow still requests `GetSalesData` on each run.

J5II and JW2T are negative in the ONS download when the bulletin says borrowing or a deficit. Charts use the negation. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Releases

Production deploys from `main` on Vercel (project `uk-public-finances`, team Comonad, https://budget.vahaah.com). PRs get preview deployments.

To cut a release: `git tag vX.Y.Z && git push origin vX.Y.Z`. The `release` workflow creates a GitHub Release with generated notes.

After a release that changes pages, run the `indexnow` workflow (Actions → indexnow → Run workflow; tick "all" for the first submission).
