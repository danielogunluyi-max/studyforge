import { LandingBodyMarker } from "@/components/landing-page/landing-body-marker";
import { Navbar } from "@/components/landing-page/navbar";
import { Hero } from "@/components/landing-page/hero";
import { Marquee } from "@/components/landing-page/marquee";
import { Features } from "@/components/landing-page/features";
import { HowItWorks } from "@/components/landing-page/how-it-works";
import { Demo } from "@/components/landing-page/demo";
import { Pricing } from "@/components/landing-page/pricing";
import { Footer } from "@/components/landing-page/footer-cta";
import { ScholarEgg } from "@/components/landing-page/scholar-egg";

export default function LandingPage() {
  return (
    <LandingBodyMarker>
      <div className="kyvex-shell">
        <Navbar />
        <main>
          <Hero />
          <Marquee />
          <HowItWorks />
          <Demo />
          <Features />
          <Pricing />
        </main>
        <Footer />
        <ScholarEgg />
      </div>
    </LandingBodyMarker>
  );
}
