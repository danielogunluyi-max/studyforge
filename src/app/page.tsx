import { LandingBodyMarker } from "@/components/landing-page/landing-body-marker"
import { Navbar } from "@/components/landing-page/navbar"
import { Hero } from "@/components/landing-page/hero"
import { Features } from "@/components/landing-page/features"
import { HowItWorks } from "@/components/landing-page/how-it-works"
import { Pricing } from "@/components/landing-page/pricing"
import { FAQ } from "@/components/landing-page/faq"
import { FooterCTA } from "@/components/landing-page/footer-cta"

export default function LandingPage() {
  return (
    <LandingBodyMarker>
      <div className="min-h-screen bg-[#fcfcfd] text-slate-900 antialiased">
        <Navbar />
        <main>
          <Hero />
          <Features />
          <HowItWorks />
          <Pricing />
          <FAQ />
        </main>
        <FooterCTA />
      </div>
    </LandingBodyMarker>
  )
}
