import type { Metadata } from "next";

import { PageIntro } from "@/components/blocks";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <PageIntro
      kicker="404"
      title="Page not found"
      lede="We could not find that page. Try the overview or the links above."
    />
  );
}
