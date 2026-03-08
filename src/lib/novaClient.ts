import type { XPEvent } from "@/lib/novaXP";

type NovaEventResponse = {
  leveledUp?: boolean;
  level?: number;
};

export function trackNovaEvent(event: XPEvent): void {
  void fetch("/api/nova", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event }),
  })
    .then(async (response) => {
      if (!response.ok || typeof window === "undefined") return;
      const payload = (await response.json().catch(() => ({}))) as NovaEventResponse;

      window.dispatchEvent(new Event("nova:sync"));
      if (payload.leveledUp && typeof payload.level === "number") {
        window.dispatchEvent(new CustomEvent("nova:levelup", { detail: { level: payload.level } }));
      }
    })
    .catch(() => {
      // XP tracking should never block the user flow.
    });
}
