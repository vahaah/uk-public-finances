import { Breadcrumb, JsonLd, PageIntro, breadcrumbJsonLd } from "@/components/blocks";
import { GLOSSARY } from "@/lib/content";
import { pageMeta } from "@/lib/meta";
import { SITE_URL } from "@/lib/site";

export const metadata = pageMeta({
  title: "Glossary of public finance terms",
  description: "Plain definitions of the public finance terms used on this site, from ONS, HM Treasury, HMRC and Bank of England wording.",
  path: "/glossary",
});

export default function GlossaryPage() {
  const defined = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "UK public finances glossary",
    url: `${SITE_URL}/glossary`,
    hasDefinedTerm: GLOSSARY.map((entry) => ({
      "@type": "DefinedTerm",
      "@id": `${SITE_URL}/glossary#${entry.id}`,
      name: entry.term,
      description: entry.body,
    })),
  };
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("Glossary", "/glossary")} />
      <JsonLd data={defined} />
      <Breadcrumb current="Glossary" />
      <PageIntro
        kicker=""
        title="Glossary"
        lede="Plain definitions of the terms used on this site."
      />
      <dl className="max-w-[68ch] divide-y divide-neutral-200 dark:divide-neutral-800">
        {GLOSSARY.map((entry) => (
          <div key={entry.id} id={entry.id} className="scroll-mt-20 py-4">
            <dt className="text-sm font-medium">{entry.term}</dt>
            <dd className="mt-1 text-sm leading-6 text-neutral-800 dark:text-neutral-200">{entry.body}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
