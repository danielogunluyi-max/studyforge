"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
];

function KMark() {
  return <span className="k-mark">K</span>;
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="site-header">
      <a href="#top" className="brand" aria-label="Kyvex home">
        <KMark />
        <span>kyvex</span>
      </a>
      <nav className={mobileOpen ? "nav-links nav-open" : "nav-links"} aria-label="Main navigation">
        {navLinks.map((link) => (
          <a key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
            {link.label}
          </a>
        ))}
        <Link href="/login" className="nav-login mobile-only-login" onClick={() => setMobileOpen(false)}>
          Log in
        </Link>
      </nav>
      <div className="header-actions">
        <Link href="/login" className="text-button nav-login">
          Log in
        </Link>
        <Link href="/register" className="lime-button small-button">
          Begin <ArrowRight size={14} />
        </Link>
        <button
          type="button"
          className="mobile-menu"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </header>
  );
}
