"use client";

import type { ReactNode } from "react";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible";

/** A section that starts closed. The panel stays in the HTML so the table can be found. */
export function Disclosure({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <Collapsible className="mt-3 text-sm">
      <CollapsibleTrigger className="flex min-h-11 w-full items-center text-left font-medium">{summary}</CollapsibleTrigger>
      <CollapsiblePanel keepMounted hiddenUntilFound>
        {children}
      </CollapsiblePanel>
    </Collapsible>
  );
}
