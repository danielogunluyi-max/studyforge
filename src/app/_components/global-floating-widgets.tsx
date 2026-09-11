"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import NovaDailyAward from "~/app/_components/nova-daily-award";

const PUBLIC_ROUTES = new Set(["/", "/login", "/register", "/signup"]);

export function GlobalFloatingWidgets() {
  const pathname = usePathname();
  const { status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const route = (pathname ?? "/").split("?")[0] ?? "/";
  if (!mounted || status !== "authenticated" || PUBLIC_ROUTES.has(route)) {
    return null;
  }

  return <NovaDailyAward />;
}
