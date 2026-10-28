import type { Metadata } from "next";

import { JsonLd, PageIntro } from "@/components/blocks";
import { FAQ } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "FAQ",
  description: "How Budget sources, signs and updates UK public finance statistics.",
  alternates: { canonical: "/faq" },
};

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
      <JsonLd data={jsonLd} />
      <PageIntro kicker="FAQ" title="Questions" lede="Answers about sources, the borrowing sign, failed updates and the OBR file." />
      <div className="max-w-3xl divide-y divide-neutral-200 dark:divide-neutral-800">
        {FAQ.map((item) => (
          <section key={item.question} className="py-4">
            <h2 className="text-sm font-medium">{item.question}</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{item.answer}</p>
          </section>
        ))}
      </div>
    </>
  );
}
