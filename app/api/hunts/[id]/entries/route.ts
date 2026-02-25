import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthSession,
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

  const hunt = await prisma.hunt.findUnique({
    where: { id: huntId, userId: session.user.id },
    include: { _count: { select: { entries: true } } },
  });
  if (!hunt) return notFound("Hunt not found");

  const body = await req.json();
  const { gameName, gameSlug, gameImage, gameProvider, betSize, cost } = body;

  if (!gameName?.trim()) return badRequest("Game name is required");
  if (cost === undefined || cost <= 0) return badRequest("Cost is required");

  const entry = await prisma.huntEntry.create({
    data: {
      huntId,
      gameName: gameName.trim(),
      gameSlug: gameSlug || null,
      gameImage: gameImage || null,
      gameProvider: gameProvider || null,
      betSize: betSize || cost,
      cost,
      position: hunt._count.entries,
    },
  });

  // Update hunt total cost
  await prisma.hunt.update({
    where: { id: huntId },
    data: { totalCost: { increment: cost } },
  });

  return NextResponse.json(entry, { status: 201 });
}
