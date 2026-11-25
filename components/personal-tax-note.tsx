import { formatBillions, formatPercent } from "@/lib/format";
import { HMRC_TAX_SUMMARY, GOVUK_TAX_CALCULATOR } from "@/lib/faq";
import { spendingShares, type SpendShare } from "@/lib/spending-shares";

/** What this site does not calculate, with the official HMRC and GOV.UK tools. */
export function PersonalTaxNote({
  spend,
}: {
  spend?: { year: string; total: number | null; items: { name: string; value: number }[] } | null;
}) {
  const shares = spend ? spendingShares(spend.items, spend.total) : [];
  return (
    <aside id="where-it-goes" className="mt-6 scroll-mt-28 max-w-[68ch] border border-neutral-200 p-6 dark:border-neutral-800">
      <h2 className="text-sm font-medium">Your own tax</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-800 dark:text-neutral-200">
        Budget does not calculate the tax you pay, and it does not split your tax across services. Tax is not earmarked.{" "}
        <a className="underline decoration-neutral-500 underline-offset-4" href={HMRC_TAX_SUMMARY}>
          HMRC&apos;s Annual Tax Summary
        </a>{" "}
        shows the income tax and National Insurance it has recorded for you. The{" "}
        <a className="underline decoration-neutral-500 underline-offset-4" href={GOVUK_TAX_CALCULATOR}>
          GOV.UK income tax calculator
        </a>{" "}
        estimates income tax and National Insurance from a salary.
      </p>
      {spend && shares.length > 0 ? (
        <SpendingSplit year={spend.year} shares={shares} />
      ) : (
        <p className="mt-2 text-sm leading-6 text-neutral-800 dark:text-neutral-200">
          <a className="underline decoration-neutral-500 underline-offset-4" href="/spending#where-it-goes">
            HM Treasury&apos;s spending shares
          </a>{" "}
          show where public spending on services went. They are not a split of your tax.
        </p>
      )}
    </aside>
  );
}

function SpendingSplit({ year, shares }: { year: string; shares: SpendShare[] }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium">Where public spending on services went in {year}</h3>
      <p className="mt-1 text-sm leading-6 text-neutral-800 dark:text-neutral-200">
        An illustration from HM Treasury&apos;s spending on services (PESA), not a split of the tax you pay. Income tax and National Insurance are only part of public sector receipts.
      </p>
      <ul className="mt-3 space-y-2">
        {shares.map((row) => (
          <li key={row.name}>
            <div className="flex justify-between gap-3 text-sm">
              <span>{row.name}</span>
              <span className="tabular-nums">
                {formatPercent(row.share)} · {formatBillions(row.billions)}
              </span>
            </div>
            <div className="mt-1 h-1.5 bg-neutral-200 dark:bg-neutral-800">
              <div className="h-full bg-neutral-950 dark:bg-white" style={{ width: `${Math.min(100, row.share)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
