"use client";

import { announce } from "@ui-sdk/core";
import { useState } from "react";

import { textButton } from "@/components/ui/popup-classes";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={textButton}
      aria-label={copied ? "Copied" : `Copy ${value}`}
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          announce("Copied");
          window.setTimeout(() => setCopied(false), 1200);
        });
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
