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
        title="What do these terms mean?"
        lede="Plain definitions of the terms used on this site."
      />
      <nav aria-label="A to Z" className="sticky top-14 z-10 mb-4 hidden gap-2 bg-white/80 py-2 text-xs backdrop-blur lg:flex dark:bg-black/80">
        {[...new Set(GLOSSARY.map((entry) => entry.term[0]?.toUpperCase() ?? ""))].map((letter) => (
          <a key={letter} href={`#letter-${letter}`} className="underline decoration-neutral-400 underline-offset-4">
            {letter}
          </a>
        ))}
      </nav>
      <dl className="max-w-[68ch] divide-y divide-neutral-200 dark:divide-neutral-800">
        {GLOSSARY.map((entry) => (
          <div key={entry.id} id={entry.id} className="scroll-mt-20 py-4">
            <span id={`letter-${entry.term[0]?.toUpperCase()}`} className="sr-only">
              {entry.term[0]}
            </span>
            <dt className="text-sm font-medium">{entry.term}</dt>
            <dd className="mt-1 text-sm leading-6 text-neutral-800 dark:text-neutral-200">{entry.body}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
