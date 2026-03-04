import { NextResponse } from "next/server";
import { auth } from "~/server/auth";

type TournamentPayload = {
  size?: 4 | 8;
  subject?: string;
  participantNames?: string[];
};

type MatchNode = {
  id: string;
  round: number;
  slot: number;
  playerA: string;
  playerB: string;
  winner: string;
};

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as TournamentPayload;
    const size = body.size === 8 ? 8 : 4;
    const names = (body.participantNames ?? []).map((name) => name.trim()).filter(Boolean).slice(0, size - 1);
    const participants = [session.user.name ?? "You", ...names];

    while (participants.length < size) {
      participants.push(`Player ${participants.length + 1}`);
    }

    const rounds = Math.log2(size);
    const bracket: MatchNode[] = [];

    let currentRoundPlayers = [...participants];
    for (let round = 1; round <= rounds; round += 1) {
      const nextRoundPlayers: string[] = [];
      for (let slot = 0; slot < currentRoundPlayers.length; slot += 2) {
        const playerA = currentRoundPlayers[slot] ?? "TBD";
        const playerB = currentRoundPlayers[slot + 1] ?? "TBD";
        const winner = Math.random() > 0.5 ? playerA : playerB;

        bracket.push({
          id: uid("match"),
          round,
          slot: slot / 2 + 1,
          playerA,
          playerB,
          winner,
        });

        nextRoundPlayers.push(winner);
      }
      currentRoundPlayers = nextRoundPlayers;
    }

    const champion = currentRoundPlayers[0] ?? "TBD";

    return NextResponse.json({
      size,
      subject: body.subject ?? "General",
      participants,
      bracket,
      champion,
      autoAdvanced: true,
    });
  } catch (error) {
    console.error("Tournament error:", error);
    return NextResponse.json({ error: "Failed to create tournament" }, { status: 500 });
  }
}
