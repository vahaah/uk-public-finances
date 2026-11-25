"use client";

import { Toolbar, ToolbarLink } from "@ui-sdk/react/toolbar";

import { ChoiceSelect } from "@/components/ui/choice-select";

export function JumpTo({ links }: { links: { href: string; label: string }[] }) {
  if (links.length < 4) return null;
  return (
    <nav aria-label="On this page" className="sticky top-14 z-10 -mx-4 mb-6 border-b border-neutral-200 bg-white/80 px-4 py-2 backdrop-blur dark:border-neutral-800 dark:bg-black/80">
      <Toolbar orientation="horizontal" loop className="hidden flex-wrap gap-x-4 gap-y-1 lg:flex">
        {links.map((link) => (
          <ToolbarLink key={link.href} href={link.href} className="inline-flex h-11 items-center text-xs underline decoration-neutral-400 underline-offset-4 lg:h-8">
            {link.label}
          </ToolbarLink>
        ))}
      </Toolbar>
      <div className="lg:hidden">
        <ChoiceSelect
          label="Jump to"
          value={null}
          placeholder="Choose a section"
          options={links.map((link) => ({ value: link.href, label: link.label }))}
          onChange={(href) => {
            document.querySelector(href)?.scrollIntoView();
          }}
        />
      </div>
    </nav>
  );
}
