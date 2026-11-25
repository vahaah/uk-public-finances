"use client";

import { announce } from "@ui-sdk/core";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@ui-sdk/react/popover";
import { useState } from "react";

import { popupPanel, textButton } from "@/components/ui/popup-classes";

export function CiteShare({
  sentence,
  citation,
  url,
}: {
  sentence: string;
  citation: string;
  url: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const note = (message: string) => {
    setStatus(message);
    announce(message);
  };
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger className={textButton} aria-label="Copy a citation for this summary">
          Cite
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" sideOffset={8} collisionPadding={12} className={popupPanel}>
          <PopoverTitle className="text-sm font-medium">Cite this figure</PopoverTitle>
          <p className="mt-2 leading-6">{citation}</p>
          <button type="button" className={`${textButton} mt-2`} onClick={() => copy(citation, () => note("Citation copied"))}>
            Copy
          </button>
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger className={textButton} aria-label="Share this page">
          Share
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" sideOffset={8} collisionPadding={12} className={popupPanel}>
          <PopoverTitle className="text-sm font-medium">Share this page</PopoverTitle>
          <p className="mt-2 leading-6">{sentence}</p>
          <p className="mt-2 break-all text-xs text-neutral-700 dark:text-neutral-300">{url}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={textButton} onClick={() => copy(url, () => note("Link copied"))}>
              Copy link
            </button>
            <button
              type="button"
              className={textButton}
              onClick={() => {
                const text = `${sentence} ${url}`;
                if (typeof navigator.share === "function") {
                  void navigator.share({ text, url }).catch(() => copy(url, () => note("Link copied")));
                  return;
                }
                copy(url, () => note("Link copied"));
              }}
            >
              Share using this device
            </button>
          </div>
        </PopoverContent>
      </Popover>
      <span className="text-xs" aria-live="polite">
        {status}
      </span>
    </div>
  );
}

function copy(value: string, done: () => void): void {
  void navigator.clipboard.writeText(value).then(done);
}
