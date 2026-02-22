"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
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
    { href: "/generator", label: "Generator" },
    { href: "/upload", label: "Upload File" },
    { href: "/my-notes", label: "My Notes" },
    { href: "/citations", label: "Citations" },
  ];

  const featureLinks = [
    { href: "/exam-predictor", label: "AI Exam Predictor" },
    { href: "/battle", label: "Study Battle Arena" },
    { href: "/learning-style-quiz", label: "Learning Style Quiz" },
    { href: "/study-groups", label: "AI Study Groups" },
    { href: "/concept-web", label: "Concept Web Builder" },
  ];

  const isActive = (href: string) => pathname === href || pathname?.startsWith(`${href}/`);

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
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 sm:gap-3">
          <img
            src="/StudyForge-logo.png"
            alt="StudyForge"
            className="h-7 w-7 sm:h-8 sm:w-8"
          />
          <span className="text-lg sm:text-xl font-semibold text-gray-900">StudyForge</span>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden items-center gap-3 lg:flex">
          {primaryLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
              <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                {featureLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActive(item.href)
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                    onClick={() => setShowFeaturesDropdown(false)}
                  >
                    {item.label}
                  </Link>
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
                className="rounded-lg p-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
                title="Settings"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
              <button
                onClick={() => void signOut({ callbackUrl: "/" })}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
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
          className="lg:hidden rounded-lg border border-gray-300 p-2 text-gray-600 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="lg:hidden border-t border-gray-200 bg-white">
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
                  onClick={() => void signOut({ callbackUrl: "/" })}
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
    </nav>
  );
}
