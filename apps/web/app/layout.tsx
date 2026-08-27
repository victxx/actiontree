import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./components/providers";
import { AppHeader } from "./components/app-header";
import { AppFooter } from "./components/app-footer";
import { GridBackground } from "./components/grid-background";

const vercelOrigin =
  process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const appOrigin =
  process.env.NEXT_PUBLIC_APP_URL ||
  (vercelOrigin ? `https://${vercelOrigin}` : "http://localhost:3000");

const openRunde = localFont({
  src: [
    {
      path: "./fonts/OpenRunde-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/OpenRunde-Semibold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-open-runde",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(appOrigin),
  title: "Actiontree — Your ENS is an app",
  description: "Executable ENS profiles powered by Solana Actions.",
  openGraph: {
    title: "Actiontree — Your ENS is an app",
    description: "Executable ENS profiles powered by Solana Actions.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Actiontree — Your ENS is an app",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Actiontree — Your ENS is an app",
    description: "Executable ENS profiles powered by Solana Actions.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${openRunde.variable} antialiased`}>
        <Providers>
          <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
            <GridBackground />
            <div className="relative z-10">
              <AppHeader />
              {children}
              <AppFooter />
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
