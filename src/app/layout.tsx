import "~/styles/globals.css";

import { type Metadata } from "next";
import { SessionProvider } from "next-auth/react";

import { TRPCReactProvider } from "~/trpc/react";
import { AppearanceSync } from "~/app/_components/appearance-sync";
import { ToastProvider, ToastViewport } from "~/app/_components/toast";
import { AppShell } from "~/app/_components/app-shell";
import { GlobalFloatingWidgets } from "~/app/_components/global-floating-widgets";
import PresetGate from "~/app/_components/preset-gate";

export const metadata: Metadata = {
  title: {
    default: "Kyvex",
    template: "%s — Kyvex",
  },
  description: "Kyvex — your AI-powered study companion",
  keywords: ["study app", "AI study tool", "flashcards", "note-taking", "exam preparation", "learning", "student productivity", "AI notes", "study assistant"],
  authors: [{ name: "Kyvex" }],
  creator: "Kyvex",
  publisher: "Kyvex",
  icons: [{ rel: "icon", url: "/Kyvex-logo.png" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://kyvex.vercel.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Kyvex",
    description: "Kyvex — your AI-powered study companion",
    siteName: "Kyvex",
    images: [
      {
        url: "/Kyvex-logo.png",
        width: 1200,
        height: 630,
        alt: "Kyvex Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kyvex",
    description: "Kyvex — your AI-powered study companion",
    images: ["/Kyvex-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
            <SessionProvider>
              {/* Removed global Listbox guard — prefer component-level guards. */}
              <AppearanceSync />
              <TRPCReactProvider>
                <ToastProvider>
                  <AppShell>
                    <div className="page-enter">{children}</div>
                  </AppShell>
                  <PresetGate />
                  <GlobalFloatingWidgets />
                  <ToastViewport />
                </ToastProvider>
              </TRPCReactProvider>
            </SessionProvider>
      </body>
    </html>
  );
}
