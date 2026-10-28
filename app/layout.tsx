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
    default: "UK public finances: tax, spending, borrowing and debt | Budget",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "UK government borrowing, tax receipts, spending and debt, using official statistics from the ONS, HMRC, HM Treasury, the Debt Management Office, the Bank of England and the OBR.",
  applicationName: SITE_NAME,
  openGraph: {
    siteName: SITE_NAME,
    locale: "en_GB",
    type: "website",
  },
};

export const revalidate = 3600;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={`${GeistSans.variable} ${GeistMono.variable}`}>
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
