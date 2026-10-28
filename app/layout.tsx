import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { Footer, Header, ThemeScript } from "@/components/chrome";
import { SITE_NAME, SITE_URL } from "@/lib/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "UK public finances",
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Borrowing, receipts, spending, debt, gilts and taxpayers for the UK, from ONS, HMRC, HM Treasury, the DMO, the Bank of England and the OBR.",
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    title: "UK public finances",
    description: "Official public finance statistics, with the source and release date on every chart.",
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const revalidate = 300;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen font-sans">
        <ThemeScript />
        <NuqsAdapter>
          <Header />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <Footer />
        </NuqsAdapter>
      </body>
    </html>
  );
}
