import Link from "next/link";

import { Breadcrumb, JsonLd, PageIntro, breadcrumbJsonLd } from "@/components/blocks";
import { CiteShare } from "@/components/cite-share";
import { faqAnchor, liveFaq } from "@/lib/faq";
import { pageMeta } from "@/lib/meta";
import { PAGE_COPY } from "@/lib/page-copy";
import { SITE_URL } from "@/lib/site";

export const metadata = pageMeta({
  title: PAGE_COPY.faq.title,
  description: PAGE_COPY.faq.description,
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
        title="Questions on UK borrowing, debt and tax"
        lede="The latest borrowing, debt and tax figures, where they come from, and how to reuse them."
      />
      <div className="max-w-[68ch] divide-y divide-neutral-200 dark:divide-neutral-800">
        {FAQ.map((item, index) => (
          <details key={item.question} id={faqAnchor(item.question)} className="scroll-mt-28 py-1" open={index === 0}>
            <summary className="cursor-pointer py-3 text-sm font-medium">{item.question}</summary>
            <p className="pb-3 text-sm leading-6 text-neutral-800 dark:text-neutral-200">{item.answer}</p>
            {index === 0 ? (
              <CiteShare sentence={item.answer} citation={`${item.answer} Via budget.vahaah.com/faq.`} url={`${SITE_URL}/faq#${faqAnchor(item.question)}`} />
            ) : null}
            {item.links && item.links.length > 0 ? (
              <p className="mt-2 pb-3 text-sm">
                {item.links.map((link, linkIndex) => (
                  <span key={link.href}>
                    {linkIndex > 0 ? " · " : null}
                    {link.href.startsWith("http") ? (
                      <a className="underline decoration-neutral-500 underline-offset-4" href={link.href}>
                        {link.label}
                      </a>
                    ) : (
                      <Link className="underline decoration-neutral-500 underline-offset-4" href={link.href}>
                        {link.label}
                      </Link>
                    )}
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
