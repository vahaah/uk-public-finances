# Agents

Budget is a Next.js 16 App Router site. Pages render snapshot JSON. They do not invent figures and they do not fetch publishers during a page render.

## Rules

- A number on a page comes from `fixtures/snapshots` or Blob. If the snapshot is missing, render the empty state.
- Parsers return `null` for blank cells, `"[X]"`, `"[not …]"` and `"-"`. Do not coerce those to zero.
- J5II and JW2T are stored as downloaded. `bulletinSign` is the negation, which matches the ONS bulletin. Do not negate debt, receipts, TME or NMFX.
- GOV.UK attachment URLs are discovered at runtime from the Content and Search APIs. Do not hard-code `assets.publishing.service.gov.uk` in workflow code.
- A zod failure must call `decidePublish` and leave the last good snapshot. Record the error on `health/{source}.json`.
- Workflow steps do the I/O. `"use workflow"` functions only orchestrate steps and call `revalidateDashboard` after a successful write.
- Keep imports at the top of the file.
- Switches on `SourceId` need a `never` default.

## Checks

`npm test` parses the committed raw files and checks the September 2026 bulletin magnitudes. `npm run publish-check` typechecks, rebuilds snapshots, fails if they drift, and runs the unit tests. `npm run test:e2e` walks every section.

## Cron

`/api/cron/ons-psf` runs in a 20-minute window around 07:05 Europe/London on the 18th–23rd. `/api/cron/daily` runs in a 20-minute window around 07:30 Europe/London. Vercel cron is UTC, so both candidate hours are scheduled. `evaluateSlot` returns a reason whenever it skips, and a run is deduped per London date and slot. `?force=1` skips the window. The bearer token is compared with `timingSafeEqual`. Overwritten Blob files (`latest.json`, `health/*.json`, `cron/*.json`) use `cacheControlMaxAge: 60`. Pages read them with `next.revalidate` of 60 seconds. The cron route reads its marker with `cache: "no-store"`. A failed check keeps the newest earlier Blob version that still validates, then the fixture. The borrowing sign is explained only on `/methodology`. Derived figures are CC BY 4.0; upstream licences stay on the source.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
