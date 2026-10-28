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
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-black/90">
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          {SITE_NAME}
        </Link>
        <nav className="flex min-w-0 flex-1 gap-3 overflow-x-auto text-sm text-neutral-600 dark:text-neutral-400">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "text-neutral-950 dark:text-white" : "hover:text-neutral-950 dark:hover:text-white"}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto flex max-w-6xl flex-wrap gap-x-4 gap-y-2 px-4 py-6 text-xs text-neutral-500">
        {FOOTER.map((item) => (
          <Link key={item.href} href={item.href} className="hover:text-neutral-950 dark:hover:text-white">
            {item.label}
          </Link>
        ))}
        <a href="/llms.txt" className="hover:text-neutral-950 dark:hover:text-white">
          llms.txt
        </a>
        <span className="ml-auto">Open UK public finances · budget.vahaah.com</span>
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
      className="text-xs text-neutral-500 hover:text-neutral-950 dark:hover:text-white"
      onClick={() => {
        const next = !document.documentElement.classList.contains("dark");
        document.documentElement.classList.toggle("dark", next);
        localStorage.setItem("theme", next ? "dark" : "light");
        setDark(next);
      }}
    >
      {dark ? "Light" : "Dark"}
    </button>
  );
}
