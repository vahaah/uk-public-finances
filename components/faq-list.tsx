"use client";

import Link from "next/link";
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, AccordionTrigger } from "@ui-sdk/react/accordion";
import { useEffect, useState } from "react";

import { CiteShare } from "@/components/cite-share";
import { GlossaryText } from "@/components/glossary-term";
import type { FaqItem } from "@/lib/content";
import { faqAnchor } from "@/lib/faq-anchor";
import { SITE_URL } from "@/lib/site";

export function FaqList({ items }: { items: FaqItem[] }) {
  const first = faqAnchor(items[0]?.question ?? "faq");
  const [value, setValue] = useState<string[]>([first]);
  useEffect(() => {
    const id = window.location.hash.replace(/^#/, "");
    if (!id) return;
    setValue((current) => (current.includes(id) ? current : [...current, id]));
  }, []);
  return (
    <Accordion
      multiple
      collapsible
      keepMounted
      hiddenUntilFound
      value={value}
      onValueChange={setValue}
      className="max-w-[68ch] divide-y divide-neutral-200 dark:divide-neutral-800"
    >
      {items.map((item, index) => {
        const id = faqAnchor(item.question);
        return (
          <AccordionItem key={item.question} value={id} id={id} className="scroll-mt-28 py-1">
            <AccordionHeader render={<h2 className="text-sm font-medium" />}>
              <AccordionTrigger className="flex min-h-11 w-full items-center py-3 text-left">{item.question}</AccordionTrigger>
            </AccordionHeader>
            <AccordionPanel>
              <div className="pb-3 text-sm leading-6 text-neutral-800 dark:text-neutral-200">
                <GlossaryText text={item.answer} />
              </div>
              {index === 0 ? (
                <CiteShare sentence={item.answer} citation={`${item.answer} Via budget.vahaah.com/faq.`} url={`${SITE_URL}/faq#${id}`} />
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
            </AccordionPanel>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
