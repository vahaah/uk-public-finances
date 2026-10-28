"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { FOOTER, NAV, SITE_NAME } from "@/lib/site";

export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html:
          'try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}',
      }}
    />
  );
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-black/90">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="shrink-0 text-sm font-semibold tracking-tight">
          {SITE_NAME}
        </Link>
        <nav className="relative hidden min-w-0 flex-1 items-center md:flex">
          <div className="flex gap-3 overflow-x-auto text-sm text-neutral-600 [scrollbar-width:none] dark:text-neutral-400">
            <NavLinks pathname={pathname} />
          </div>
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-md border border-neutral-300 text-sm md:hidden dark:border-neutral-700"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((value) => !value)}
          >
            Menu
          </button>
          <ThemeToggle />
        </div>
      </div>
      <div className="relative border-t border-neutral-200 md:hidden dark:border-neutral-800">
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent dark:from-black" />
        <nav className="flex snap-x gap-3 overflow-x-auto px-4 py-2 text-sm [scrollbar-width:none]">
          <NavLinks pathname={pathname} />
        </nav>
      </div>
      {open ? (
        <nav id="site-menu" className="border-t border-neutral-200 bg-white px-4 py-3 md:hidden dark:border-neutral-800 dark:bg-black">
          <div className="flex flex-col gap-3 text-sm">
            <NavLinks pathname={pathname} />
          </div>
        </nav>
      ) : null}
    </header>
  );
}

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 snap-start whitespace-nowrap ${active ? "font-medium text-neutral-950 dark:text-white" : "text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"}`}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-2 px-4 py-6 text-[13px] text-neutral-900 md:flex-row md:flex-wrap md:gap-x-4 dark:text-neutral-100">
        {FOOTER.map((item) => (
          <Link key={item.href} href={item.href} className="underline decoration-neutral-400 underline-offset-4">
            {item.label}
          </Link>
        ))}
        <a href="/llms.txt" className="underline decoration-neutral-400 underline-offset-4">
          llms.txt
        </a>
        <a href="/llms-full.txt" className="underline decoration-neutral-400 underline-offset-4">
          llms-full.txt
        </a>
        <span>UK public finances from official statistics</span>
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

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  return (
    <button
      type="button"
      className="inline-flex size-8 items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-700"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => {
        const next = !document.documentElement.classList.contains("dark");
        document.documentElement.classList.toggle("dark", next);
        localStorage.setItem("theme", next ? "dark" : "light");
        setDark(next);
      }}
    >
      <SunIcon className="hidden size-4 dark:block" />
      <MoonIcon className="size-4 dark:hidden" />
    </button>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path stroke="currentColor" strokeWidth="1.5" d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.2 3.2l1 1M11.8 11.8l1 1M3.2 12.8l1-1M11.8 4.2l1-1" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path fill="currentColor" d="M9.5 1.5a6 6 0 1 0 5 9.2 5 5 0 1 1-5-9.2Z" />
    </svg>
  );
}
