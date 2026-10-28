import Link from "next/link";

import { Breadcrumb, JsonLd, PageIntro, breadcrumbJsonLd } from "@/components/blocks";
import { liveFaq } from "@/lib/faq";
import { pageMeta } from "@/lib/meta";
import { SITE_URL } from "@/lib/site";

export const metadata = pageMeta({
  title: "UK public finances FAQ: borrowing, debt and tax",
  description: "How much the UK borrows and owes, what it spends on debt interest, how much tax it collects, and where the figures come from.",
  path: "/faq",
});

export default async function FaqPage() {
  const FAQ = await liveFaq();
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
        {FAQ.map((item, index) => (
          <details key={item.question} className="py-1" open={index === 0}>
            <summary className="cursor-pointer py-3 text-sm font-medium">{item.question}</summary>
            <p className="pb-3 text-sm leading-6 text-neutral-800 dark:text-neutral-200">{item.answer}</p>
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
          </details>
        ))}
      </div>
    </>
  );
}
