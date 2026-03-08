"use client";

import { useEffect } from "react";
import { trackNovaEvent } from "@/lib/novaClient";

const DAILY_AWARD_KEY = "nova_daily_awarded";

export default function NovaDailyAward() {
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const alreadyAwarded = sessionStorage.getItem(DAILY_AWARD_KEY);
    if (alreadyAwarded === today) return;

    sessionStorage.setItem(DAILY_AWARD_KEY, today);
    trackNovaEvent("DAILY_LOGIN");
  }, []);

  return null;
}
