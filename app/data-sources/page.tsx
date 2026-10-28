import { Breadcrumb, JsonLd, PageIntro, breadcrumbJsonLd } from "@/components/blocks";
import { pageMeta } from "@/lib/meta";
import { SOURCE_IDS } from "@/lib/schema";
import { DERIVED_LICENCE, DERIVED_LICENCE_URL, SOURCES } from "@/lib/site";

export const metadata = pageMeta({
  title: "Data sources and licences",
  description: "The official publishers, datasets and licences behind every figure on this site.",
  path: "/data-sources",
});

export default function DataSourcesPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("Data sources", "/data-sources")} />
      <Breadcrumb current="Data sources" />
      <PageIntro
        kicker="Sources"
        title="Data sources"
        lede="Contains public sector information licensed under the Open Government Licence v3.0, from the ONS, HMRC, HM Treasury and the OBR. Bank of England and Debt Management Office data is used under their own terms."
      />
      <p className="mb-6 max-w-[68ch] text-sm leading-6 text-neutral-800 dark:text-neutral-200">
        Figures this site calculates, such as totals and shares, are{" "}
        <a className="underline decoration-neutral-500 underline-offset-4" href={DERIVED_LICENCE_URL}>
          {DERIVED_LICENCE}
        </a>
        . Credit the original publisher, and this site for a calculated figure. See{" "}
        <a className="underline decoration-neutral-500 underline-offset-4" href="/methodology">
          Methodology
        </a>{" "}
        for how files are checked.
      </p>
      <ul className="divide-y divide-neutral-200 border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {SOURCE_IDS.map((id) => {
          const source = SOURCES[id];
          return (
            <li key={id} id={id} className="scroll-mt-4 px-4 py-4 text-sm">
              <a className="font-medium underline decoration-neutral-500 underline-offset-4" href={source.page}>
                {source.publisher}
              </a>
              <p className="mt-1 text-neutral-800 dark:text-neutral-200">{source.title}</p>
              <p className="mt-1 text-neutral-700 dark:text-neutral-300">
                {source.licence}
                {" · "}
                <a className="underline decoration-neutral-500 underline-offset-4" href={source.licenceUrl}>
                  Licence terms
                </a>
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
