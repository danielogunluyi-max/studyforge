export type InboxTab = "inbox" | "record" | "lecture" | "classroom" | "quizlet";

const TABS: InboxTab[] = ["inbox", "record", "lecture", "classroom", "quizlet"];

export function parseInboxTab(value: string | null | undefined): InboxTab {
  const raw = (value ?? "").trim().toLowerCase();
  return TABS.includes(raw as InboxTab) ? (raw as InboxTab) : "inbox";
}

export function inboxHref(tab: InboxTab): string {
  return tab === "inbox" ? "/smart-upload" : `/smart-upload?tab=${tab}`;
}
