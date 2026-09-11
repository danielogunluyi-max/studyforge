import { IBM_Plex_Mono, Instrument_Serif, Inter_Tight } from "next/font/google";

import "~/styles/landing.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-serif",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${interTight.variable} ${instrumentSerif.variable} ${ibmPlexMono.variable}`}>
      {children}
    </div>
  );
}
