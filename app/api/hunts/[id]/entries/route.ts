import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthSession,
  getEffectiveUserId,
  unauthorized,
  notFound,
  badRequest,
} from "@/lib/auth-helpers";

// POST /api/hunts/[id]/entries — add an entry to a hunt
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: huntId } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const selectedOwnerId = req.headers.get("x-owner-id");
  const userId = getEffectiveUserId(session.user, selectedOwnerId);

  const hunt = await prisma.hunt.findUnique({
    where: { id: huntId, userId },
    include: { _count: { select: { entries: true } } },
  });
  if (!hunt) return notFound("Hunt not found");

  const body = await req.json();
  const { gameName, gameSlug, gameImage, gameProvider } = body;

  if (!gameName?.trim()) return badRequest("Game name is required");

  const betSize = parseFloat(body.betSize);
  if (!betSize || betSize <= 0) return badRequest("Bet size is required");
  const cost = body.cost ? parseFloat(body.cost) : betSize;

  const entry = await prisma.huntEntry.create({
    data: {
      huntId,
      gameName: gameName.trim(),
      gameSlug: gameSlug || null,
      gameImage: gameImage || null,
      gameProvider: gameProvider || null,
      betSize,
      cost,
      position: hunt._count.entries,
    },
  });

  // Update hunt total cost
  await prisma.hunt.update({
    where: { id: huntId },
    data: { totalCost: { increment: cost } },
  });

  // Increment game popularity counter
  if (gameSlug) {
    await prisma.game.update({
      where: { slug: gameSlug },
      data: { timesUsedInHunts: { increment: 1 } },
    }).catch(() => {}); // Ignore if game not in catalog
  }

  return NextResponse.json(entry, { status: 201 });
}
