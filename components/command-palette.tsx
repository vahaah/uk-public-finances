"use client";

import { Command, CommandEmpty, CommandGroup, CommandGroupLabel, CommandInput, CommandItem, CommandList } from "@ui-sdk/react/command";
import { Dialog, DialogBackdrop, DialogContent, DialogTitle } from "@ui-sdk/react/dialog";
import { useShortcut } from "@ui-sdk/react/shortcuts";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { matchCommand, type CommandItem as SiteCommand } from "@/lib/command-match";

const GROUPS: { kind: SiteCommand["kind"]; label: string }[] = [
  { kind: "figure", label: "Latest figures" },
  { kind: "page", label: "Pages" },
  { kind: "faq", label: "FAQ" },
  { kind: "glossary", label: "Glossary" },
];

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const layer = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<SiteCommand[] | null>(null);
  useShortcut(
    "mod+k",
    (event) => {
      event.preventDefault();
      onClose();
    },
    { layer },
  );
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    void fetch("/api/command")
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<SiteCommand[]>;
      })
      .then(setItems)
      .catch(() => setFailed(true));
  }, []);
  const go = (value: string) => {
    const href = value.slice(value.indexOf("\n") + 1);
    if (!href) return;
    onClose();
    router.push(href);
  };
  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }} presentation="dialog" modal>
      {/* A controlled dialog has no trigger to anchor to, so it is placed here. */}
      <DialogBackdrop className="fixed inset-0 bg-black/40" style={{ position: "fixed", inset: 0 }} />
      <DialogContent
        initialFocus="input"
        className="w-[min(32rem,calc(100vw-2rem))] border border-neutral-200 bg-white text-neutral-950 shadow-lg dark:border-neutral-800 dark:bg-black dark:text-neutral-50"
        style={{ position: "fixed", top: "12vh", left: "50%", translate: "-50% 0", margin: 0 }}
      >
        <DialogTitle className="sr-only">Search Budget</DialogTitle>
        <div ref={layer}>
        <Command
          filter={(item, query) => {
            const kind = item.keywords?.[0] as SiteCommand["kind"] | undefined;
            if (!kind) return false;
            return matchCommand({ kind, label: item.label, href: "", hint: item.keywords?.[1] ?? "" }, query);
          }}
          onAction={go}
          loop
        >
          <CommandInput
            aria-label="Search pages, figures, FAQ and glossary"
            placeholder="Search pages, figures, FAQ, glossary"
            className="h-12 w-full border-b border-neutral-200 bg-transparent px-4 text-sm outline-none dark:border-neutral-800"
          />
          {items == null ? <p className="px-4 py-3 text-sm">{failed ? "The index did not load." : "Loading…"}</p> : null}
          <CommandList className="max-h-[50vh] overflow-y-auto py-2">
            {GROUPS.map((group) => (
              <CommandGroup key={group.kind}>
                <CommandGroupLabel className="px-4 py-1 text-xs text-neutral-700 dark:text-neutral-300">{group.label}</CommandGroupLabel>
                {(items ?? [])
                  .filter((item) => item.kind === group.kind)
                  .map((item) => (
                    <CommandItem
                      key={`${item.kind}\n${item.href}\n${item.label}`}
                      value={`${item.kind}\n${item.href}`}
                      label={item.label}
                      keywords={[item.kind, item.hint]}
                      className={(state) =>
                        `flex w-full items-baseline justify-between gap-3 px-4 py-2 text-left text-sm ${state.highlighted ? "bg-neutral-100 dark:bg-neutral-900" : ""}`
                      }
                    >
                      <span className="min-w-0">{item.label}</span>
                      <span className="shrink-0 text-xs text-neutral-700 dark:text-neutral-300">{item.hint}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            ))}
          </CommandList>
          {items ? <CommandEmpty className="px-4 py-3 text-sm">No matches.</CommandEmpty> : null}
        </Command>
        </div>
      </DialogContent>
    </Dialog>
  );
}
