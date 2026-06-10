// Route-group layout for authentication screens (login, register, signup,
// forgot-password, reset-password). It is intentionally isolated from the
// marketing (landing) group so the two can evolve independent chrome.
//
// All shared providers (SessionProvider, ThemeProvider, tRPC, toasts) live in
// the root app/layout.tsx, and each auth page renders its own full-screen
// <AuthGlassShell>, so this boundary only needs to pass children through.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
