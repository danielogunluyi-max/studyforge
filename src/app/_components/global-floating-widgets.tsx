"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import NovaDailyAward from "~/app/_components/nova-daily-award";
import Dock from "~/app/_components/dock";

const PUBLIC_ROUTES = new Set(["/", "/login", "/register", "/signup"]);

export function GlobalFloatingWidgets() {
  const pathname = usePathname();
  const { status } = useSession();

  const shouldRender = useMemo(() => {
    if (status !== "authenticated") {
      return false;
    }

    const route = (pathname ?? "/").split("?")[0] ?? "/";
    return !PUBLIC_ROUTES.has(route);
  }, [pathname, status]);

  if (!shouldRender) {
    return null;
  }

  return (
    <>
      <NovaDailyAward />
      <Dock />
    </>
  );
}