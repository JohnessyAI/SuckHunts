import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/games/search?q=gates&limit=20 — game autocomplete search
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") ?? "20"), 50);

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const games = await prisma.game.findMany({
    where: {
      name: { contains: q, mode: "insensitive" },
    },
    select: {
      slug: true,
      name: true,
      provider: true,
      imageUrl: true,
      rtp: true,
      volatility: true,
      maxWin: true,
    },
    orderBy: { timesUsedInHunts: "desc" },
    take: limit,
  });

  return NextResponse.json(games);
}
