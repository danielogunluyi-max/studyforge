"use client";

import { useRouter } from "next/navigation";
import NovaVisionPanel from "~/app/_components/nova-vision-panel";
import NovaVoicePanel from "~/app/_components/nova-voice-panel";
import { TutorModeTabs } from "~/app/_components/tutor-mode-tabs";
import { tutorHref, type TutorMode } from "~/lib/tutor-mode";
import TutorChat from "./_tutor-chat";

export default function TutorWorkspace({
  initialMode,
  embed,
}: {
  initialMode: TutorMode;
  embed: boolean;
}) {
  const router = useRouter();
  const mode = initialMode;

  const setMode = (next: TutorMode) => {
    const sp = new URLSearchParams(window.location.search);
    router.replace(
      tutorHref(next, {
        embed,
        noteId: sp.get("noteId"),
        mockId: sp.get("mockId"),
        deckId: sp.get("deckId"),
        course: sp.get("course"),
      }),
      { scroll: false },
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8">
      <div className="kv-crumb">
        Kyvex / <b>Nova</b>
      </div>
      <h1 className="kv-title" style={{ marginTop: 14 }}>
        Nova
      </h1>
      <p className="kv-sub mt-2">
        Ontario Grade 11–12 tutor. Remembers this conversation — not other chats. Ask, quiz, or work a problem step by
        step.
      </p>
      <TutorModeTabs mode={mode} onChange={setMode} />
      <div style={{ marginTop: 22 }}>
        {mode === "voice" ? <NovaVoicePanel /> : mode === "vision" ? <NovaVisionPanel /> : <TutorChat />}
      </div>
    </div>
  );
}
