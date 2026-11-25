"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { matchCommand, type CommandItem } from "@/lib/command-match";

const GROUPS: { kind: CommandItem["kind"]; label: string }[] = [
  { kind: "figure", label: "Latest figures" },
  { kind: "page", label: "Pages" },
  { kind: "faq", label: "FAQ" },
  { kind: "glossary", label: "Glossary" },
];

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const titleId = useId();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<CommandItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  useEffect(() => {
    inputRef.current?.focus();
    const previous = document.activeElement;
    void fetch("/api/command")
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<CommandItem[]>;
      })
      .then(setItems)
      .catch(() => setFailed(true));
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  const matches = useMemo(() => (items ?? []).filter((item) => matchCommand(item, query)).slice(0, 24), [items, query]);
  useEffect(() => {
    setActive(0);
  }, [query]);
  const go = (item: CommandItem | undefined) => {
    if (!item) return;
    onClose();
    router.push(item.href);
  };
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 px-4 pt-[12vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-black"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
            return;
          }
          if (event.key === "Tab") {
            const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>("button, input")];
            const first = focusable[0];
            const last = focusable.at(-1);
            if (!first || !last) return;
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
            return;
          }
          if (matches.length === 0) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => Math.min(matches.length - 1, index + 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => Math.max(0, index - 1));
          } else if (event.key === "Enter") {
            event.preventDefault();
            go(matches[active]);
          }
        }}
      >
        <h2 id={titleId} className="sr-only">
          Search Budget
        </h2>
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={matches[active] ? optionId(listId, active) : undefined}
          value={query}
          placeholder="Search pages, figures, FAQ, glossary"
          className="h-12 w-full border-b border-neutral-200 bg-transparent px-4 text-sm outline-none dark:border-neutral-800"
          onChange={(event) => setQuery(event.target.value)}
        />
        <div id={listId} role="listbox" className="max-h-[50vh] overflow-y-auto py-2">
          {failed ? <p className="px-4 py-3 text-sm">The index did not load.</p> : null}
          {!failed && items == null ? <p className="px-4 py-3 text-sm">Loading…</p> : null}
          {items && matches.length === 0 ? <p className="px-4 py-3 text-sm">No matches.</p> : null}
          {GROUPS.map((group) => {
            const rows = matches.flatMap((item, index) => (item.kind === group.kind ? [{ item, index }] : []));
            if (rows.length === 0) return null;
            return (
              <div key={group.kind} className="pb-2">
                <p className="px-4 py-1 text-xs text-neutral-700 dark:text-neutral-300">{group.label}</p>
                {rows.map(({ item, index }) => (
                  <button
                    key={`${item.kind}-${item.href}-${item.label}`}
                    id={optionId(listId, index)}
                    type="button"
                    role="option"
                    aria-selected={index === active}
                    className={`flex w-full items-baseline justify-between gap-3 px-4 py-2 text-left text-sm ${index === active ? "bg-neutral-100 dark:bg-neutral-900" : ""}`}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(item)}
                  >
                    <span className="min-w-0">{item.label}</span>
                    <span className="shrink-0 text-xs text-neutral-700 dark:text-neutral-300">{item.hint}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function optionId(listId: string, index: number): string {
  return `${listId}-option-${index}`;
}
