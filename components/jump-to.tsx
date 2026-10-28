"use client";

export function JumpTo({ links }: { links: { href: string; label: string }[] }) {
  if (links.length < 4) return null;
  return (
    <nav aria-label="On this page" className="sticky top-14 z-10 -mx-4 mb-6 border-b border-neutral-200 bg-white/80 px-4 py-2 backdrop-blur dark:border-neutral-800 dark:bg-black/80">
      <div className="hidden flex-wrap gap-x-4 gap-y-1 lg:flex">
        {links.map((link) => (
          <a key={link.href} href={link.href} className="text-xs underline decoration-neutral-400 underline-offset-4">
            {link.label}
          </a>
        ))}
      </div>
      <label className="flex items-center gap-2 text-xs lg:hidden">
        Jump to
        <select
          className="h-8 rounded-md border border-neutral-300 bg-white px-2 dark:border-neutral-700 dark:bg-neutral-950"
          defaultValue=""
          onChange={(event) => {
            const id = event.target.value;
            if (!id) return;
            document.querySelector(id)?.scrollIntoView();
          }}
        >
          <option value="">Choose a section</option>
          {links.map((link) => (
            <option key={link.href} value={link.href}>
              {link.label}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}
