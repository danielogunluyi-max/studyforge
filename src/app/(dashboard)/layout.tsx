import { AppShell } from "~/app/_components/app-shell"
import { GlobalFloatingWidgets } from "~/app/_components/global-floating-widgets"
import PresetGate from "~/app/_components/preset-gate"
import OnboardingTour from "~/app/_components/onboarding-tour"
import CommandPalette from "~/app/_components/command-palette"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <AppShell>{children}</AppShell>
      <PresetGate />
      <GlobalFloatingWidgets />
      <CommandPalette showTrigger={false} />
      <OnboardingTour />
    </>
  )
}
