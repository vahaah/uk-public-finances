"use client";

import { useEffect, useState } from "react";

/** Sticky chapter jump bar; highlights the chapter in view. */
export function ChapterBar({ chapters }: { chapters: { id: string; label: string }[] }) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const update = () => {
      const line = Math.max(window.innerHeight * 0.3, window.matchMedia("(min-width: 768px)").matches ? 120 : 170);
      let current: string | null = null;
      for (const chapter of chapters) {
        const element = document.getElementById(chapter.id);
        if (element && element.getBoundingClientRect().top <= line) current = chapter.id;
      }
      setActive(current);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [chapters]);
  return (
    <nav aria-label="Chapters" className="sticky top-[5.8rem] z-10 -mx-4 mb-2 border-b border-neutral-200 bg-white/90 px-4 backdrop-blur md:top-14 dark:border-neutral-800 dark:bg-black/90">
      <ol className="flex gap-1 overflow-x-auto py-2 text-xs [scrollbar-width:none] sm:text-sm">
        {chapters.map((chapter) => (
          <li key={chapter.id}>
            <a
              href={`#${chapter.id}`}
              aria-current={active === chapter.id ? "location" : undefined}
              className={`inline-flex h-8 items-center whitespace-nowrap rounded-md px-3 ${active === chapter.id ? "bg-neutral-950 text-white dark:bg-neutral-50 dark:text-neutral-950" : "border border-neutral-300 dark:border-neutral-700"}`}
            >
              {chapter.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
