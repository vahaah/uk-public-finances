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
        title="Where do the numbers come from?"
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
      <div className="space-y-6">
        {publishers(SOURCE_IDS).map((group) => (
          <section key={group.publisher} className="border border-neutral-200 dark:border-neutral-800">
            <h2 className="border-b border-neutral-200 px-4 py-3 text-sm font-medium dark:border-neutral-800">
              <a className="underline decoration-neutral-400 underline-offset-4" href={group.page}>
                {group.publisher}
              </a>
            </h2>
            <ul>
              {group.ids.map((id) => {
                const source = SOURCES[id];
                return (
                  <li key={id} id={id} className="scroll-mt-20 border-t border-neutral-200 px-4 py-3 text-sm first:border-t-0 dark:border-neutral-800">
                    <p>
                      <a className="underline decoration-neutral-400 underline-offset-4" href={source.page}>
                        {source.title}
                      </a>
                    </p>
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
          </section>
        ))}
      </div>
    </>
  );
}

function publishers(ids: readonly (keyof typeof SOURCES)[]): { publisher: string; page: string; ids: (keyof typeof SOURCES)[] }[] {
  const groups: { publisher: string; page: string; ids: (keyof typeof SOURCES)[] }[] = [];
  for (const id of ids) {
    const source = SOURCES[id];
    const existing = groups.find((group) => group.publisher === source.publisher);
    if (existing) existing.ids.push(id);
    else groups.push({ publisher: source.publisher, page: source.page, ids: [id] });
  }
  return groups;
}
