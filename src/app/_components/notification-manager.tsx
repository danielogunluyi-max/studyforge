"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

type NotifItem = { title: string; body: string; url?: string };

export function NotificationManager() {
  const { data: session } = useSession();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const grantedRef = useRef(false);

  useEffect(() => {
    if (!session?.user) return;
    if (!("Notification" in window)) return;

    const poll = async () => {
      if (!grantedRef.current) return;
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const data = (await res.json()) as { notifications?: NotifItem[] };
        for (const item of data.notifications ?? []) {
          const n = new Notification(item.title, {
            body: item.body,
            icon: "/Kyvex-logo.png",
          });
          if (item.url) {
            const url = item.url;
            n.onclick = () => {
              window.open(url, "_blank", "noopener,noreferrer");
            };
          }
        }
      } catch {
        // ignore transient poll errors
      }
    };

    const init = async () => {
      if (Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        grantedRef.current = perm === "granted";
      } else {
        grantedRef.current = Notification.permission === "granted";
      }

      await poll();
      timerRef.current = setInterval(() => {
        void poll();
      }, POLL_INTERVAL);
    };

    void init();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session?.user]);

  return null;
}
