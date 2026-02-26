import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/games/search?q=gates&limit=20 — fast game autocomplete
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const limit = Math.min(
    parseInt(req.nextUrl.searchParams.get("limit") ?? "20"),
    50
  );

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  // Use trigram similarity for fuzzy matching + ILIKE for exact substring
  // Orders by: exact prefix first, then similarity score, then popularity
  const games = await prisma.$queryRaw`
    SELECT slug, name, provider, "imageUrl", rtp, volatility, "maxWin"
    FROM "Game"
    WHERE name ILIKE ${"%" + q + "%"}
       OR provider ILIKE ${"%" + q + "%"}
    ORDER BY
      (name ILIKE ${q + "%"})::int DESC,
      similarity(name, ${q}) DESC,
      "timesUsedInHunts" DESC
    LIMIT ${limit}
  `;

  return NextResponse.json(games, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
