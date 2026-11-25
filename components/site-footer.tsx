import Link from "next/link";

import { LogoMark } from "@/components/logo";
import { pageIndexLinks } from "@/components/page-index";

export async function SiteFooter() {
  const links = await pageIndexLinks();
  return (
    <footer className="mt-16 border-t border-neutral-200 dark:border-neutral-800">
      <nav aria-label="All pages" className="mx-auto max-w-6xl px-4 pt-6">
        <ul className="flex flex-wrap gap-x-4 gap-y-2 text-[13px]">
          {links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="underline decoration-neutral-400 underline-offset-4">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-2 px-4 py-6 text-[13px] text-neutral-900 md:flex-row md:flex-wrap md:gap-x-4 dark:text-neutral-100">
        <Link href="/data-health" className="underline decoration-neutral-400 underline-offset-4">
          Data health
        </Link>
        <Link href="/api" className="underline decoration-neutral-400 underline-offset-4">
          API
        </Link>
        <a href="/llms.txt" className="underline decoration-neutral-400 underline-offset-4">
          llms.txt
        </a>
        <a href="/llms-full.txt" className="underline decoration-neutral-400 underline-offset-4">
          llms-full.txt
        </a>
        <span className="inline-flex items-center gap-1.5">
          <LogoMark className="size-4" />
          UK public finances from official statistics
        </span>
        <span>
          Made by{" "}
          <a href="https://vahaah.com" rel="author" className="underline decoration-neutral-400 underline-offset-4">
            Alex Vakhitov
          </a>
        </span>
      </div>
    </footer>
  );
}
