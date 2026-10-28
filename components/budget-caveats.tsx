export function BudgetCaveats() {
  return (
    <details className="mt-8 rounded-md border border-neutral-200 p-4 text-sm dark:border-neutral-800">
      <summary className="cursor-pointer font-medium">How to read these comparisons</summary>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-neutral-800 dark:text-neutral-200">
        <li>Outturn figures are revised by the ONS for years after the event. Each difference uses the ONS release shown in Sources, and is updated when the ONS revises.</li>
        <li>Changes to how things are classified, such as the treatment of student loans or the Bank of England&apos;s schemes, can move borrowing and debt without any change in policy. These are marked &quot;Basis changed&quot;.</li>
        <li>Each forecast assumes the policies in place at the time. Later policy changes are one reason outturns differ.</li>
        <li>Large shocks, such as the pandemic and the energy price rise, account for many of the biggest differences. A forecast difference is not a broken promise.</li>
      </ul>
    </details>
  );
}
