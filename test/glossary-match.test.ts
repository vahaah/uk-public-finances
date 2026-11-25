import { describe, expect, it } from "vitest";

import { glossarySegments } from "@/lib/glossary-match";

describe("glossary segments", () => {
  it("wraps the longer public-sector term and leaves the rest of the sentence", () => {
    const segments = glossarySegments("Public sector net borrowing was higher, and GDP rose.");
    expect(segments.map((segment) => [segment.text, segment.term?.id ?? null])).toEqual([
      ["Public sector net borrowing", "psnb"],
      [" was higher, and ", null],
      ["GDP", "gdp"],
      [" rose.", null],
    ]);
  });

  it("does not match a term inside another word", () => {
    const segments = glossarySegments("GDPR is not gross domestic product.");
    expect(segments.every((segment) => segment.term == null)).toBe(true);
  });
});
