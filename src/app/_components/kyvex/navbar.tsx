"use client"

import { Sparkles, Menu, X } from "lucide-react"
import { useState } from "react"

const links = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
]

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-white/70 backdrop-blur-xl">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <a href="#" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </span>
            <span className="font-heading font-semibold text-foreground">Kyvex</span>
          </a>

          <ul className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            {links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  className="hover:text-foreground transition-colors"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden md:flex items-center gap-3">
            <a
              href="#"
              className="text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Log In
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium rounded-xl bg-primary px-4 py-2.5 text-primary-foreground hover:bg-blue-700 transition-colors"
            >
              Get Started
            </a>
          </div>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg text-foreground hover:bg-secondary"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="md:hidden py-4 flex flex-col gap-2">
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                {l.label}
              </a>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <a
                href="#"
                className="px-3 py-2 rounded-lg text-sm font-medium text-foreground hover:text-primary transition-colors"
              >
                Log In
              </a>
              <a
                href="#pricing"
                className="px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-blue-700 transition-colors text-center"
              >
                Get Started
              </a>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
