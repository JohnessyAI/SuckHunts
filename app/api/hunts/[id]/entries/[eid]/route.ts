import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthSession,
  unauthorized,
  notFound,
} from "@/lib/auth-helpers";

// PATCH /api/hunts/[id]/entries/[eid] — update entry (record result, change status)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; eid: string }> }
) {
  const { id: huntId, eid } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const hunt = await prisma.hunt.findUnique({
    where: { id: huntId, userId: session.user.id },
  });
  if (!hunt) return notFound("Hunt not found");

  const entry = await prisma.huntEntry.findUnique({
    where: { id: eid, huntId },
  });
  if (!entry) return notFound("Entry not found");

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.result !== undefined) {
    const result = parseFloat(body.result);
    data.result = result;
    data.multiplier = entry.cost.toNumber() > 0 ? result / entry.cost.toNumber() : 0;
    data.status = "completed";

    // Update hunt totals
    const oldResult = entry.result ? entry.result.toNumber() : 0;
    const diff = result - oldResult;
    await prisma.hunt.update({
      where: { id: huntId },
      data: { totalWon: { increment: diff } },
    });
  }

  if (body.status !== undefined) {
    data.status = body.status;
  }

  if (body.betSize !== undefined) data.betSize = body.betSize;
  if (body.cost !== undefined) {
    const oldCost = entry.cost.toNumber();
    const newCost = parseFloat(body.cost);
    data.cost = newCost;
    await prisma.hunt.update({
      where: { id: huntId },
      data: { totalCost: { increment: newCost - oldCost } },
    });
  }

  const updated = await prisma.huntEntry.update({
    where: { id: eid },
    data,
  });

  return NextResponse.json(updated);
}

// DELETE /api/hunts/[id]/entries/[eid] — remove entry from hunt
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; eid: string }> }
) {
  const { id: huntId, eid } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const hunt = await prisma.hunt.findUnique({
    where: { id: huntId, userId: session.user.id },
  });
  if (!hunt) return notFound("Hunt not found");

  const entry = await prisma.huntEntry.findUnique({
    where: { id: eid, huntId },
  });
  if (!entry) return notFound("Entry not found");

  await prisma.huntEntry.delete({ where: { id: eid } });

  // Update hunt totals
  await prisma.hunt.update({
    where: { id: huntId },
    data: {
      totalCost: { decrement: entry.cost.toNumber() },
      totalWon: { decrement: entry.result?.toNumber() ?? 0 },
    },
  });

  return NextResponse.json({ ok: true });
}
