"use client";

import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@ui-sdk/react/popover";
import type { ReactNode } from "react";

import { popupPanel } from "@/components/ui/popup-classes";
import type { Term } from "@/lib/content";
import { glossarySegments } from "@/lib/glossary-match";

export function GlossaryText({ text }: { text: string }): ReactNode {
  const segments = glossarySegments(text);
  return segments.map((segment, index) =>
    segment.term ? <GlossaryTerm key={`${segment.term.id}-${index}`} term={segment.term} label={segment.text} /> : <span key={index}>{segment.text}</span>,
  );
}

export function GlossaryTerm({ term, label }: { term: Term; label?: string }) {
  return (
    <Popover>
      <PopoverTrigger className="inline border-0 border-b border-dotted border-neutral-500 bg-transparent p-0 text-inherit">
        {label ?? term.term}
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" sideOffset={8} collisionPadding={12} className={popupPanel}>
        <PopoverTitle className="text-sm font-medium">{term.term}</PopoverTitle>
        <PopoverDescription className="mt-2 text-sm leading-6 text-neutral-800 dark:text-neutral-200">{term.body}</PopoverDescription>
        <a href={`/glossary#${term.id}`} className="mt-2 inline-flex h-11 items-center text-xs underline decoration-neutral-500 underline-offset-4 sm:h-8">
          Glossary
        </a>
      </PopoverContent>
    </Popover>
  );
}
