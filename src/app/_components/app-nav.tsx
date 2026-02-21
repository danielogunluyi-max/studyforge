"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function AppNav() {
  const { data: session, status } = useSession();
  const isLoading = status === "loading";

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/StudyForge-logo.png"
            alt="StudyForge"
            className="h-8 w-8"
          />
          <span className="text-xl font-semibold text-gray-900">StudyForge</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/generator"
            className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            Generator
          </Link>
          <Link
            href="/upload"
            className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            Upload File
          </Link>
          <Link
            href="/my-notes"
            className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
          >
            My Notes
          </Link>
          
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse rounded bg-gray-200" />
          ) : session?.user ? (
            <>
              <Link
                href="/profile"
                className="text-sm font-medium text-gray-900 transition hover:text-blue-600"
              >
                {session.user.name || session.user.email}
              </Link>
              <button
                onClick={() => void signOut({ callbackUrl: "/" })}
                className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 transition hover:text-gray-900"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
