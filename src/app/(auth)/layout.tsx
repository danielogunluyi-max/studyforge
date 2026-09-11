import "~/styles/auth.css";

// Route-group layout for authentication screens (login, register, signup,
// forgot-password, reset-password). Isolated from marketing chrome.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
