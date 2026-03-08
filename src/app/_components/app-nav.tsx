"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "~/app/_components/button";

export function AppNav() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isLoading = status === "loading";
  const [showFeaturesDropdown, setShowFeaturesDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const primaryLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/generator", label: "Generator" },
    { href: "/upload", label: "Upload File" },
    { href: "/my-notes", label: "My Notes" },
    { href: "/citations", label: "Citations" },
  ];

  const featureLinks = [
    { href: "/dashboard", label: "Exam Dashboard", description: "Track countdowns, pressure, and daily plans", icon: "spark", section: "Study Tools" },
    { href: "/generator", label: "Generator", description: "Turn notes into study formats", icon: "doc", section: "Study Tools" },
    { href: "/scan", label: "Scan Notes", description: "Scan handwritten notes with AI", icon: "camera", section: "Study Tools" },
    { href: "/upload", label: "Upload File", description: "Extract text from PDFs and images", icon: "upload", section: "Study Tools" },
    { href: "/my-notes", label: "My Notes", description: "Manage your saved study library", icon: "stack", section: "Study Tools" },
    { href: "/citations", label: "Citations", description: "Generate academic citations quickly", icon: "book", section: "Study Tools" },
    { href: "/exam-predictor", label: "AI Exam Predictor", description: "Predict likely exam questions", icon: "spark", section: "Unique Features" },
    { href: "/battle", label: "Study Battle Arena", description: "Compete with friends in quiz duels", icon: "shield", section: "Unique Features" },
    { href: "/learning-style-quiz", label: "Learning Style Quiz", description: "Discover and optimize your style", icon: "puzzle", section: "Unique Features" },
    { href: "/study-groups", label: "AI Study Groups", description: "Collaborate with AI moderation", icon: "group", section: "Unique Features" },
    { href: "/concept-web", label: "Concept Web Builder", description: "Visualize concept relationships", icon: "nodes", section: "Unique Features" },
    { href: "/tutor", label: "Nova AI Tutor", description: "Chat with your AI study coach", icon: "star", section: "Unique Features" },
  ];

  const groupedFeatureLinks = {
    "Study Tools": featureLinks.filter((item) => item.section === "Study Tools"),
    "Unique Features": featureLinks.filter((item) => item.section === "Unique Features"),
  };

  const featureIcon = (icon: string) => {
    const cls = "h-4 w-4";
    if (icon === "doc") return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 3.75h6L18 8.25v12H7.5A2.25 2.25 0 015.25 18V6A2.25 2.25 0 017.5 3.75z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.5 3.75v4.5H18" /></svg>;
    if (icon === "upload") return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16.5V6m0 0 3.75 3.75M12 6 8.25 9.75" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.5 16.5v1.5A2.25 2.25 0 006.75 20.25h10.5A2.25 2.25 0 0019.5 18v-1.5" /></svg>;
    if (icon === "stack") return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 6.75h10.5v3H6.75zM5.25 10.5h10.5v3H5.25zM6.75 14.25h10.5v3H6.75z" /></svg>;
    if (icon === "book") return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.5 5.25A2.25 2.25 0 016.75 3h10.5v16.5H6.75A2.25 2.25 0 014.5 17.25V5.25z" /></svg>;
    if (icon === "spark") return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m12 3 1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5L12 3z" /></svg>;
    if (icon === "shield") return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3.75 5.25 6v5.25c0 4.2 2.8 7.95 6.75 9 3.95-1.05 6.75-4.8 6.75-9V6L12 3.75z" /></svg>;
    if (icon === "puzzle") return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 4.5A1.75 1.75 0 0110 2.75h2A1.75 1.75 0 0113.75 4.5v.75h2.75A1.75 1.75 0 0118.25 7v2.75h.75a1.75 1.75 0 010 3.5h-.75V16A1.75 1.75 0 0116.5 17.75h-2.75v.75A1.75 1.75 0 0112 20.25h-2a1.75 1.75 0 01-1.75-1.75v-.75H5.5A1.75 1.75 0 013.75 16v-2.75H3a1.75 1.75 0 010-3.5h.75V7A1.75 1.75 0 015.5 5.25h2.75V4.5z" /></svg>;
    if (icon === "group") return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 18.75v-1.5a3.75 3.75 0 00-7.5 0v1.5M12.75 9.75a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM19.5 9a1.5 1.5 0 11-3 0" /></svg>;
    if (icon === "nodes") return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="5" r="2" /><circle cx="19" cy="12" r="2" /><circle cx="12" cy="19" r="2" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.7 10.9 10.3 6.1M13.7 6.1l3.6 4.8M17.3 13.1 13.7 17.9M10.3 17.9 6.7 13.1" /></svg>;
    if (icon === "camera") return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 7.5h3l1.5-2.25h7.5l1.5 2.25h3A1.5 1.5 0 0121.75 9v9.75A1.5 1.5 0 0120.25 20.25H3.75A1.5 1.5 0 012.25 18.75V9A1.5 1.5 0 013.75 7.5z" /><circle cx="12" cy="13" r="3.25" strokeWidth={1.5} /></svg>;
    return <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m12 3 1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5L12 3z" /></svg>;
  };

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

  const router = useRouter();

  const handleSignOut = async () => {
    try {
      // Prevent NextAuth from redirecting; do a client navigation after server sign-out
      await signOut({ redirect: false });
    } catch (err) {
      // ignore
    }
    // Force navigate and reload to ensure any cached auth state is cleared
    router.push('/');
    // Ensure a full reload to clear any in-memory caches
    setTimeout(() => window.location.reload(), 100);
  };

  useEffect(() => {
    setShowFeaturesDropdown(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (event.target instanceof Node && !dropdownRef.current.contains(event.target)) {
        setShowFeaturesDropdown(false);
      }
    };

    if (showFeaturesDropdown) {
      document.addEventListener("mousedown", onDocumentClick);
    }

    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
    };
  }, [showFeaturesDropdown]);

  return (
    <nav className="site-nav sticky top-0 z-40 isolate border-b border-gray-200 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 sm:gap-3">
          <img
            src="/Kyvex-logo.png"
            alt="Kyvex"
            className="h-7 w-7 sm:h-8 sm:w-8"
          />
          <span className="text-lg sm:text-xl font-semibold text-gray-900">Kyvex</span>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden items-center gap-3 md:flex">
          {primaryLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link-animated rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isActive(item.href) ? "bg-blue-50 text-blue-700 shadow-sm" : "text-gray-700"
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* Features Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setShowFeaturesDropdown(!showFeaturesDropdown)}
              className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                showFeaturesDropdown
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-transparent text-gray-700 hover:border-gray-200 hover:bg-gray-100 hover:text-gray-900"
              }`}
              aria-expanded={showFeaturesDropdown}
              aria-haspopup="menu"
            >
              Features
              <svg
                className={`h-4 w-4 transition-transform ${showFeaturesDropdown ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showFeaturesDropdown && (
              <div className="site-dropdown absolute right-0 top-full z-[9999] mt-2 w-[360px] rounded-xl border border-slate-700 bg-[#0d142b] p-2 text-slate-100 shadow-2xl shadow-black/40 animate-[featuresDrop_180ms_ease-out]">
                {Object.entries(groupedFeatureLinks).map(([section, items], sectionIndex) => (
                  <div key={section} className={sectionIndex > 0 ? "mt-2 border-t border-slate-700 pt-2" : ""}>
                    <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{section}</p>
                    {items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group block rounded-lg border-l-2 px-3 py-2 transition-all duration-200 ${
                          isActive(item.href)
                            ? "border-blue-400 bg-blue-500/20"
                            : "border-transparent hover:border-blue-400 hover:bg-slate-800/70"
                        }`}
                        onClick={() => setShowFeaturesDropdown(false)}
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 text-slate-300 group-hover:text-blue-300">{featureIcon(item.icon)}</span>
                          <div>
                            <p className="text-sm font-semibold text-slate-100 group-hover:text-blue-200">{item.label}</p>
                            <p className="text-xs text-slate-400">{item.description}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse rounded bg-gray-200" />
          ) : session?.user ? (
            <>
              <Link
                href="/settings"
                className="nav-link-animated rounded-lg p-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
                title="Settings"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
              <button
                onClick={() => void handleSignOut()}
                className="nav-link-animated rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="nav-link-animated rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
              >
                Log In
              </Link>
              <Button href="/signup" size="sm">Sign Up</Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden rounded-lg border border-gray-300 p-2 text-gray-600 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white animate-[mobileNavSlide_220ms_ease-out]">
          <div className="mx-auto w-full max-w-7xl space-y-2 px-4 py-4 sm:px-6">
            {primaryLinks.map((item) => (
              <Link key={item.href} href={item.href} className={`block rounded-lg px-4 py-2 text-sm font-medium transition ${isActive(item.href) ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`}>
                {item.label}
              </Link>
            ))}
            
            <div className="border-t border-gray-200 my-2 pt-2">
              <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Features</p>
              {featureLinks.map((item) => (
                <Link key={item.href} href={item.href} className={`block rounded-lg px-4 py-2 text-sm transition ${isActive(item.href) ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"}`} onClick={() => setMobileMenuOpen(false)}>
                  {item.label}
                </Link>
              ))}
            </div>

            {session?.user ? (
              <>
                <Link href="/settings" className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">
                  Settings
                </Link>
                <button
                  onClick={() => void handleSignOut()}
                  className="block w-full rounded-lg px-4 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="block px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg">
                  Log In
                </Link>
                <Link href="/signup" className="block rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-700 hover:shadow-md">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes mobileNavSlide {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes featuresDrop {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </nav>
  );
}

