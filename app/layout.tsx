import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import Script from "next/script";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import { Footer, Header, ThemeScript } from "@/components/chrome";
import {
  PLAUSIBLE_DOMAIN,
  PLAUSIBLE_EVENT_PATH,
  PLAUSIBLE_QUEUE_STUB,
  PLAUSIBLE_SCRIPT_PATH,
  isPlausibleEnabled,
} from "@/lib/plausible";
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
    images: [{ url: "/og", width: 1200, height: 630, alt: "Budget, UK public finances" }],
  },
  twitter: { card: "summary_large_image", images: ["/og"] },
  authors: [{ name: "Alex Vakhitov", url: "https://vahaah.com" }],
};

export const revalidate = 3600;

export default function RootLayout({ children }: { children: ReactNode }) {
  const plausible = isPlausibleEnabled();

  return (
    <html lang="en-GB" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen font-sans">
        <ThemeScript />
        <NuqsAdapter>
          <Header />
          <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
          <Footer />
        </NuqsAdapter>
        {plausible ? (
          <>
            <Script id="plausible-queue" strategy="afterInteractive">
              {PLAUSIBLE_QUEUE_STUB}
            </Script>
            <Script
              id="plausible"
              src={PLAUSIBLE_SCRIPT_PATH}
              strategy="afterInteractive"
              data-domain={PLAUSIBLE_DOMAIN}
              data-api={PLAUSIBLE_EVENT_PATH}
            />
          </>
        ) : null}
      </body>
    </html>
  );
}
