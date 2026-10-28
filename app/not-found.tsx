import type { Metadata } from "next";
import Link from "next/link";

import { PageIntro } from "@/components/blocks";

export const metadata: Metadata = {
  title: "Page not found",
  description: "This page does not exist. Find UK borrowing, tax, spending and debt figures from the overview.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-content-start">
      <PageIntro kicker="404" title="Page not found" lede="That page does not exist. Go to the overview." />
      <Link href="/" className="inline-flex h-9 items-center px-4 text-sm underline decoration-neutral-400 underline-offset-4">
        Go to overview
      </Link>
    </div>
  );
}
