"use client";

import { Toolbar, ToolbarLink } from "@ui-sdk/react/toolbar";

/** Letter jump bar. Shown at every width; arrow keys move between letters. */
export function GlossaryLetters({ letters }: { letters: string[] }) {
  return (
    <nav aria-label="A to Z" className="sticky top-14 z-10 -mx-4 mb-4 bg-white/80 px-4 py-2 backdrop-blur dark:bg-black/80">
      <Toolbar orientation="horizontal" loop className="flex gap-2 overflow-x-auto text-xs [scrollbar-width:none]">
        {letters.map((letter) => (
          <ToolbarLink key={letter} href={`#letter-${letter}`} className="inline-flex size-11 shrink-0 items-center justify-center underline decoration-neutral-400 underline-offset-4 sm:size-8">
            {letter}
          </ToolbarLink>
        ))}
      </Toolbar>
    </nav>
  );
}
