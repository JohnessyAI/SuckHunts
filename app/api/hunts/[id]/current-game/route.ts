import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "@/lib/auth-helpers";

// GET /api/hunts/[id]/current-game — public enriched current game data
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const hunt = await prisma.hunt.findUnique({
    where: { id },
    include: {
      entries: { orderBy: { position: "asc" } },
    },
  });

  if (!hunt) return notFound("Hunt not found");

  // Find current game: explicit "playing" status, or first entry without a result
  const playing =
    hunt.entries.find((e) => e.status === "playing") ??
    hunt.entries.find((e) => e.result == null);

  if (!playing) {
    return NextResponse.json(null);
  }

  // Fetch enriched data if we have a game slug
  let info = null;
  let personalRecord = null;

  if (playing.gameSlug) {
    const [game, gameStat] = await Promise.all([
      prisma.game.findUnique({
        where: { slug: playing.gameSlug },
        select: {
          rtp: true,
          volatility: true,
          maxWin: true,
          imageUrl: true,
          provider: true,
        },
      }),
      prisma.gameStat.findUnique({
        where: {
          userId_gameSlug: {
            userId: hunt.userId,
            gameSlug: playing.gameSlug,
          },
        },
      }),
    ]);

    if (game) {
      info = {
        rtp: game.rtp?.toString() ?? null,
        volatility: game.volatility,
        maxWin: game.maxWin,
      };
    }

    if (gameStat) {
      const betKey = playing.betSize.toNumber().toFixed(2);
      const betRecords = (gameStat.betSizeRecords as Record<string, Record<string, number>>) || {};
      const atBet = betRecords[betKey] || null;

      personalRecord = {
        timesPlayed: gameStat.timesPlayed,
        biggestWin: gameStat.biggestWin.toNumber(),
        biggestWinBet: gameStat.biggestWinBet.toNumber(),
        biggestMultiplier: gameStat.biggestMultiplier.toNumber(),
        biggestMultiBet: gameStat.biggestMultiBet.toNumber(),
        avgMultiplier: gameStat.avgMultiplier.toNumber(),
        atCurrentBet: atBet
          ? {
              bestWin: atBet.bestWin,
              bestMulti: atBet.bestMulti,
              timesPlayed: atBet.timesPlayed,
              avgWin: atBet.timesPlayed > 0 ? atBet.totalWon / atBet.timesPlayed : 0,
            }
          : null,
      };
    }
  }

  return NextResponse.json({
    gameName: playing.gameName,
    gameImage: playing.gameImage,
    gameProvider: playing.gameProvider,
    betSize: playing.betSize.toString(),
    info,
    personalRecord,
  });
}
