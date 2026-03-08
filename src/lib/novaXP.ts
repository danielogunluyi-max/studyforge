export const XP_EVENTS = {
  NOTE_GENERATED: { xp: 15, message: "Note generated! +15 XP" },
  FLASHCARD_STUDIED: { xp: 3, message: "Flashcard reviewed! +3 XP" },
  DECK_COMPLETED: { xp: 25, message: "Deck complete! +25 XP" },
  AUDIO_CONVERTED: { xp: 20, message: "Audio converted! +20 XP" },
  EXAM_RESULT_SAVED: { xp: 10, message: "Result recorded! +10 XP" },
  BATTLE_WON: { xp: 30, message: "Battle won! +30 XP" },
  DAILY_LOGIN: { xp: 5, message: "Daily login! +5 XP" },
  SCAN_COMPLETED: { xp: 10, message: "Notes scanned! +10 XP" },
} as const;

export type XPEvent = keyof typeof XP_EVENTS;

export function xpToNextLevel(level: number): number {
  return level * 100;
}

export function calculateLevel(totalXP: number): number {
  let level = 1;
  let xpRequired = 100;
  let remaining = totalXP;

  while (remaining >= xpRequired) {
    remaining -= xpRequired;
    level += 1;
    xpRequired = level * 100;
  }

  return level;
}

export function xpInCurrentLevel(totalXP: number): number {
  let level = 1;
  let xpRequired = 100;
  let remaining = totalXP;

  while (remaining >= xpRequired) {
    remaining -= xpRequired;
    level += 1;
    xpRequired = level * 100;
  }

  return remaining;
}

export function happinessFromActivity(hoursSinceLastActive: number): number {
  if (hoursSinceLastActive < 24) return 0;
  if (hoursSinceLastActive < 48) return -5;
  if (hoursSinceLastActive < 72) return -15;
  return -25;
}

export function getNovaState(happiness: number): {
  emoji: string;
  label: string;
  color: string;
  message: string;
} {
  if (happiness >= 80) {
    return {
      emoji: "🌟",
      label: "Thriving",
      color: "var(--accent-green)",
      message: "I'm so happy studying with you! Keep it up! 🎉",
    };
  }

  if (happiness >= 60) {
    return {
      emoji: "😊",
      label: "Happy",
      color: "var(--accent-blue)",
      message: "We're on a roll! What shall we study next?",
    };
  }

  if (happiness >= 40) {
    return {
      emoji: "😐",
      label: "Neutral",
      color: "var(--accent-orange)",
      message: "I miss studying with you. Open a note? 📖",
    };
  }

  if (happiness >= 20) {
    return {
      emoji: "😟",
      label: "Sad",
      color: "var(--accent-orange)",
      message: "I haven't seen you in a while... come study!",
    };
  }

  return {
    emoji: "😴",
    label: "Sleepy",
    color: "var(--accent-red)",
    message: "Zzz... wake me up when you're ready to study 💤",
  };
}
