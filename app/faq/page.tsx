import Link from "next/link";

import { Breadcrumb, JsonLd, PageIntro, breadcrumbJsonLd } from "@/components/blocks";
import { FAQ } from "@/lib/content";
import { pageMeta } from "@/lib/meta";
import { SITE_URL } from "@/lib/site";

export const metadata = pageMeta({
  title: "Frequently asked questions",
  description: "Where the figures on this site come from, how often they update and how you can use them.",
  path: "/faq",
});

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: `${SITE_URL}/faq`,
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("FAQ", "/faq")} />
      <JsonLd data={jsonLd} />
      <Breadcrumb current="FAQ" />
      <PageIntro
        kicker="FAQ"
        title="Frequently asked questions"
        lede="Where the figures come from, when they update and how to reuse them."
      />
      <div className="max-w-[68ch] divide-y divide-neutral-200 dark:divide-neutral-800">
        {FAQ.map((item) => (
          <section key={item.question} className="py-4">
            <h2 className="text-sm font-medium">{item.question}</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-800 dark:text-neutral-200">{item.answer}</p>
            {item.links && item.links.length > 0 ? (
              <p className="mt-2 text-sm">
                {item.links.map((link, index) => (
                  <span key={link.href}>
                    {index > 0 ? " · " : null}
                    <Link className="underline decoration-neutral-500 underline-offset-4" href={link.href}>
                      {link.label}
                    </Link>
                  </span>
                ))}
              </p>
            ) : null}
          </section>
        ))}
      </div>
    </>
  );
}
