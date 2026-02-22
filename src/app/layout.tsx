import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { SessionProvider } from "next-auth/react";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: {
    default: "StudyForge - Turn Notes Into Knowledge",
    template: "%s | StudyForge",
  },
  description: "Free AI-powered study tool for students. Transform lecture notes into summaries, flashcards, and practice questions in seconds. Study smarter, not harder.",
  keywords: ["study app", "AI study tool", "flashcards", "note-taking", "exam preparation", "learning", "student productivity", "AI notes", "study assistant"],
  authors: [{ name: "StudyForge" }],
  creator: "StudyForge",
  publisher: "StudyForge",
  icons: [{ rel: "icon", url: "/StudyForge-logo.png" }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://studyforgeapp.vercel.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "StudyForge - Turn Notes Into Knowledge",
    description: "Free AI-powered study tool for students. Transform lecture notes into summaries, flashcards, and practice questions in seconds.",
    siteName: "StudyForge",
    images: [
      {
        url: "/StudyForge-logo.png",
        width: 1200,
        height: 630,
        alt: "StudyForge Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "StudyForge - Turn Notes Into Knowledge",
    description: "Free AI-powered study tool for students. Transform lecture notes into summaries, flashcards, and practice questions.",
    images: ["/StudyForge-logo.png"],
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

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <SessionProvider>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}