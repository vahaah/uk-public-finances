"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@ui-sdk/react/collapsible";
import { useShortcut, useShortcutHint } from "@ui-sdk/react/shortcuts";
import { Toggle } from "@ui-sdk/react/toggle";
import { Toolbar, ToolbarLink } from "@ui-sdk/react/toolbar";

import { LogoMark } from "@/components/logo";
import { SITE_NAME } from "@/lib/site";

const CommandPalette = dynamic(() => import("@/components/command-palette").then((mod) => mod.CommandPalette), { ssr: false });

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

export function Header({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const searchKeys = useShortcutHint("mod+k");
  useShortcut("mod+k", (event) => {
    event.preventDefault();
    setPalette((value) => !value);
  });
  useEffect(() => {
    setOpen(false);
    setPalette(false);
  }, [pathname]);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="contents">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-black/90">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold tracking-tight">
            <LogoMark className="size-5" />
            {SITE_NAME}
          </Link>
          <nav aria-label="Sections" className="relative hidden min-w-0 flex-1 items-center md:flex">
            <Toolbar orientation="horizontal" loop className="flex gap-3 overflow-x-auto text-sm [scrollbar-width:none]">
              <NavLinks pathname={pathname} links={links} />
            </Toolbar>
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <button
              type="button"
              className="inline-flex h-11 items-center gap-1.5 rounded-md border border-neutral-300 px-2.5 text-sm md:h-9 dark:border-neutral-700"
              aria-label="Search"
              aria-keyshortcuts={searchKeys.ariaKeyshortcuts}
              onClick={() => setPalette(true)}
              onMouseEnter={() => void import("@/components/command-palette")}
              onFocus={() => void import("@/components/command-palette")}
            >
              <SearchIcon />
              <span className="max-[420px]:sr-only">Search</span>
            </button>
            <CollapsibleTrigger className="inline-flex h-11 items-center rounded-md border border-neutral-300 px-3 text-sm md:hidden dark:border-neutral-700">
              Menu
            </CollapsibleTrigger>
            <ThemeToggle />
          </div>
        </div>
        <div className="relative border-t border-neutral-200 md:hidden dark:border-neutral-800">
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent dark:from-black" />
          <nav aria-label="Sections" className="px-4 py-2">
            <Toolbar orientation="horizontal" loop className="flex snap-x gap-3 overflow-x-auto text-sm [scrollbar-width:none]">
              <NavLinks pathname={pathname} links={links} />
            </Toolbar>
          </nav>
        </div>
        <CollapsiblePanel id="site-menu" className="border-t border-neutral-200 bg-white px-4 py-3 md:hidden dark:border-neutral-800 dark:bg-black">
          <nav aria-label="Menu">
            <Toolbar orientation="vertical" className="flex flex-col gap-1 text-sm">
              <NavLinks pathname={pathname} links={links} stacked />
            </Toolbar>
          </nav>
        </CollapsiblePanel>
        {palette ? <CommandPalette onClose={() => setPalette(false)} /> : null}
      </header>
    </Collapsible>
  );
}

function NavLinks({ pathname, links, stacked = false }: { pathname: string; links: { href: string; label: string }[]; stacked?: boolean }) {
  const current = currentHref(pathname, links);
  return (
    <>
      {links.map((item) => {
        const active = item.href === current;
        return (
          <ToolbarLink
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            render={<Link href={item.href} />}
            className={`${stacked ? "flex h-11 items-center" : "inline-flex h-11 shrink-0 snap-start items-center whitespace-nowrap md:h-8"} ${active ? "font-medium text-neutral-950 dark:text-white" : "text-neutral-600 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"}`}
          >
            {item.label}
          </ToolbarLink>
        );
      })}
    </>
  );
}

function currentHref(pathname: string, links: { href: string }[]): string | undefined {
  let best: string | undefined;
  for (const link of links) {
    const matches = link.href === "/" ? pathname === "/" : pathname === link.href || pathname.startsWith(`${link.href}/`);
    if (matches && (!best || link.href.length > best.length)) best = link.href;
  }
  return best;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
      <circle cx="7" cy="7" r="4.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.2 10.2 14 14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  return (
    <Toggle
      pressed={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onPressedChange={(next) => {
        document.documentElement.classList.toggle("dark", next);
        localStorage.setItem("theme", next ? "dark" : "light");
        setDark(next);
      }}
      className="inline-flex size-11 items-center justify-center rounded-md border border-neutral-300 md:size-9 dark:border-neutral-700"
    >
      <SunIcon className="hidden size-4 dark:block" />
      <MoonIcon className="size-4 dark:hidden" />
    </Toggle>
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
