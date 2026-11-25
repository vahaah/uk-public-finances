import { Breadcrumb, JsonLd, PageIntro, breadcrumbJsonLd } from "@/components/blocks";
import { FaqList } from "@/components/faq-list";
import { liveFaq } from "@/lib/faq";
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
      <FaqList items={FAQ} />
    </>
  );
}
