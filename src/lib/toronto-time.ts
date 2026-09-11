const TORONTO_TZ = "America/Toronto";

export function formatTorontoDate(value: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TORONTO_TZ,
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function formatTorontoDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TORONTO_TZ,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatTorontoToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TORONTO_TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export function torontoGreeting(): string {
  const hourPart = new Intl.DateTimeFormat("en-CA", {
    timeZone: TORONTO_TZ,
    hour: "numeric",
    hourCycle: "h23",
  })
    .formatToParts(new Date())
    .find((part) => part.type === "hour")?.value;

  const hour = Number(hourPart ?? 0);
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}
