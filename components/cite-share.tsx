"use client";

import { useState } from "react";

export function CiteShare({
  sentence,
  citation,
  url,
}: {
  sentence: string;
  citation: string;
  url: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"cite" | "link" | null>(null);
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="h-8 rounded-md border border-neutral-300 px-3 text-xs dark:border-neutral-700"
        aria-label="Copy a citation for this summary"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Cite
      </button>
      <button
        type="button"
        className="h-8 rounded-md border border-neutral-300 px-3 text-xs dark:border-neutral-700"
        aria-label="Share this page"
        onClick={() => {
          const text = `${sentence} ${url}`;
          if (typeof navigator.share === "function") {
            void navigator.share({ text, url }).catch(() => copy(url, () => setCopied("link")));
            return;
          }
          copy(url, () => setCopied("link"));
        }}
      >
        Share
      </button>
      {copied === "link" ? <span className="text-xs">Link copied</span> : null}
      {open ? (
        <div className="w-full rounded-md border border-neutral-200 p-3 text-sm dark:border-neutral-800">
          <p className="font-medium">Cite this figure</p>
          <p className="mt-2 leading-6">{citation}</p>
          <button
            type="button"
            className="mt-2 h-8 rounded-md border border-neutral-300 px-3 text-xs dark:border-neutral-700"
            onClick={() => copy(citation, () => setCopied("cite"))}
          >
            {copied === "cite" ? "Copied" : "Copy"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function copy(value: string, done: () => void): void {
  void navigator.clipboard.writeText(value).then(done);
}
