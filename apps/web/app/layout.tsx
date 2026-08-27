import type { Metadata } from "next";
import { Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./components/providers";
import { AppHeader } from "./components/app-header";
import { GridBackground } from "./components/grid-background";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ),
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
      <body
        className={`${spaceGrotesk.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
            <GridBackground />
            <div className="relative z-10">
              <AppHeader />
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
