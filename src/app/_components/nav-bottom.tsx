"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Settings, User } from "lucide-react";
import { signOut } from "next-auth/react";
import { useDisclosurePanel } from "~/lib/hooks/use-disclosure-panel";
import { detectDeviceClass, type DeviceClass } from "~/lib/device-class";
import {
  groupNavEntries,
  isNavEntryEnabled,
  navEntriesFor,
  type NavSectionId,
} from "~/lib/nav-registry";
import { useEnabledFeatureSet } from "~/lib/use-feature-enabled";

const BOTTOM_TABS = [
  { key: "home", label: "Home", icon: "🏠", href: "/dashboard" },
  { key: "study", label: "Study", icon: "📚", href: "/my-notes" },
  { key: "test", label: "Test", icon: "📋", href: "/mock-exam" },
  { key: "track", label: "Track", icon: "📊", href: "/mastery" },
  { key: "more", label: "More", icon: "⋯", href: null as string | null },
];

const MOBILE_ENTRIES = navEntriesFor("mobile");

type NavBottomProps = {
  /** When the sidebar drawer is open, hide the bottom bar entirely. */
  hidden?: boolean;
};

export default function NavBottom({ hidden = false }: NavBottomProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreSection, setMoreSection] = useState<NavSectionId | null>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const morePanelRef = useRef<HTMLDivElement>(null);
  const enabledFeatures = useEnabledFeatureSet();
  const [deviceClass, setDeviceClass] = useState<DeviceClass>("phone");

  useEffect(() => {
    setDeviceClass(detectDeviceClass());
  }, []);

  const mobileGroups = useMemo(
    () =>
      groupNavEntries(
        MOBILE_ENTRIES.filter((entry) => isNavEntryEnabled(entry, enabledFeatures)),
        deviceClass,
      ),
    [enabledFeatures, deviceClass],
  );

  const closeMore = useCallback(() => {
    setMoreOpen(false);
    setMoreSection(null);
  }, []);

  useEffect(() => {
    setMoreOpen(false);
    setMoreSection(null);
  }, [pathname]);

  useEffect(() => {
    if (hidden) closeMore();
  }, [hidden, closeMore]);

  useDisclosurePanel({
    open: moreOpen,
    onClose: closeMore,
    panelRef: morePanelRef,
    triggerRef: moreButtonRef,
  });

  const handleSignOut = async () => {
    closeMore();
    try {
      await signOut({ redirect: false });
    } catch {
      // ignore
    }
    router.push("/");
  };

  const openGroup = mobileGroups.find((group) => group.id === moreSection);

  if (hidden) return null;

  return (
    <div className="lg:hidden">
      {moreOpen && (
        <>
          <div
            aria-hidden="true"
            onClick={closeMore}
            className="fixed inset-0 z-[998]"
            style={{ background: "rgba(0,0,0,0.6)" }}
          />
          <div
            ref={morePanelRef}
            id="kyvex-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="More"
            tabIndex={-1}
            className="kv-bottom-sheet"
          >
            {openGroup === undefined ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {mobileGroups.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setMoreSection(s.id)}
                      className="kv-btn-ghost flex-col"
                    >
                      <span className="kv-meta">{s.label}</span>
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border-default)" }}>
                  <p className="kv-meta mb-3">ACCOUNT</p>
                  <div className="flex flex-col gap-1">
                    <Link href="/profile" className="sidebar-nav-item" onClick={closeMore}>
                      <User size={16} strokeWidth={1.75} aria-hidden="true" />
                      <span className="truncate text-xs">Profile</span>
                    </Link>
                    <Link href="/settings" className="sidebar-nav-item" onClick={closeMore}>
                      <Settings size={16} strokeWidth={1.75} aria-hidden="true" />
                      <span className="truncate text-xs">Settings</span>
                    </Link>
                    <button type="button" className="sidebar-nav-item w-full" onClick={() => void handleSignOut()}>
                      <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
                      <span className="truncate text-xs">Log out</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <button type="button" onClick={() => setMoreSection(null)} className="kv-btn-ghost mb-3">
                  ← Back
                </button>
                <p className="kv-meta mb-3">{openGroup.label}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {openGroup.items.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`sidebar-nav-item ${active ? "is-active" : ""}`}
                      >
                        <Icon size={16} strokeWidth={1.75} />
                        <span className="truncate text-xs">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      <nav className="kv-bottom-nav">
        {BOTTOM_TABS.map((tab) => {
          const isActive = tab.href
            ? pathname === tab.href || pathname.startsWith(tab.href + "/")
            : moreOpen;

          return tab.href ? (
            <Link key={tab.key} href={tab.href} className={`kv-bottom-tab ${isActive ? "on" : ""}`}>
              <span className="dot" aria-hidden="true" />
              <span className="label">{tab.label}</span>
            </Link>
          ) : (
            <button
              key={tab.key}
              ref={moreButtonRef}
              type="button"
              onClick={() => (moreOpen ? closeMore() : setMoreOpen(true))}
              aria-expanded={moreOpen}
              aria-controls={moreOpen ? "kyvex-more-sheet" : undefined}
              aria-label={moreOpen ? "Close menu" : "Open menu"}
              className={`kv-bottom-tab ${isActive ? "on" : ""}`}
            >
              <span className="dot" aria-hidden="true" />
              <span className="label">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
