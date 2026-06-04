import "~/styles/globals.css";

import { Suspense } from "react";
import { type Metadata } from "next";
import { SessionProvider } from "next-auth/react";

import { TRPCReactProvider } from "~/trpc/react";
import { AppearanceSync } from "~/app/_components/appearance-sync";
import { ToastProvider, ToastViewport } from "~/app/_components/toast";
import { NotificationManager } from "~/app/_components/notification-manager";
import { KeyboardShortcuts } from "~/app/_components/keyboard-shortcuts";
import { ToastContainer } from "~/app/_components/toast";
import ErrorBoundary from "~/app/_components/error-boundary";
import { UnhandledRejectionListener } from "~/app/_components/unhandled-rejection-listener";
import ThemeProvider from "~/app/_components/theme-provider";

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var raw=localStorage.getItem('kyvex:appearance');var theme='light';if(raw){var parsed=JSON.parse(raw);if(parsed.theme==='dark'||(parsed.theme==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches)) theme='dark';}document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.style.colorScheme=theme;}catch(e){}})();`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
            <SessionProvider>
              {/* Removed global Listbox guard — prefer component-level guards. */}
              <AppearanceSync />
              <UnhandledRejectionListener />
              <NotificationManager />
              <KeyboardShortcuts />
              <TRPCReactProvider>
                <ToastProvider>
                  <Suspense fallback={null}>
                    <ErrorBoundary>
                      <div className="page-enter">{children}</div>
                    </ErrorBoundary>
                  </Suspense>
                  <ToastViewport />
                  <ToastContainer />
                </ToastProvider>
              </TRPCReactProvider>
            </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
