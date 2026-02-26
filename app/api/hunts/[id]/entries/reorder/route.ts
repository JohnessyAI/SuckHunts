import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthSession,
  unauthorized,
  notFound,
  badRequest,
} from "@/lib/auth-helpers";

// PUT /api/hunts/[id]/entries/reorder — batch update entry positions
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: huntId } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const hunt = await prisma.hunt.findUnique({
    where: { id: huntId, userId: session.user.id },
  });
  if (!hunt) return notFound("Hunt not found");

  const body = await req.json();
  const { order } = body;

  if (!Array.isArray(order) || order.length === 0) {
    return badRequest("order must be a non-empty array of entry IDs");
  }

  await prisma.$transaction(
    order.map((entryId: string, index: number) =>
      prisma.huntEntry.update({
        where: { id: entryId, huntId },
        data: { position: index },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
