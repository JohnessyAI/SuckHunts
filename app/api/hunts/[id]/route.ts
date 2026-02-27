import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthSession,
  getEffectiveUserId,
  unauthorized,
  notFound,
  badRequest,
} from "@/lib/auth-helpers";

// GET /api/hunts/[id] — get a single hunt with entries
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const selectedOwnerId = req.headers.get("x-owner-id");
  const userId = getEffectiveUserId(session.user, selectedOwnerId);

  const hunt = await prisma.hunt.findUnique({
    where: { id, userId },
    include: {
      entries: { orderBy: { position: "asc" } },
    },
  });

  if (!hunt) return notFound("Hunt not found");

  return NextResponse.json(hunt);
}

// PATCH /api/hunts/[id] — update hunt (title, status)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const selectedOwnerId = req.headers.get("x-owner-id");
  const userId = getEffectiveUserId(session.user, selectedOwnerId);

  const hunt = await prisma.hunt.findUnique({
    where: { id, userId },
  });
  if (!hunt) return notFound("Hunt not found");

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = body.title.trim();
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.startBalance !== undefined)
    data.startBalance = body.startBalance != null ? parseFloat(body.startBalance) : null;
  if (body.currency !== undefined) data.currency = body.currency;
  if (body.discordWebhook !== undefined)
    data.discordWebhook = body.discordWebhook?.trim() || null;
  if (body.status !== undefined) {
    if (!["preparing", "live", "completed"].includes(body.status)) {
      return badRequest("Invalid status");
    }
    data.status = body.status;
    if (body.status === "live") {
      // Deactivate all other live hunts for this owner
      await prisma.hunt.updateMany({
        where: { userId, status: "live", id: { not: id } },
        data: { status: "completed", completedAt: new Date() },
      });
      if (!hunt.startedAt) {
        data.startedAt = new Date();
      }
    }
    if (body.status === "completed") {
      data.completedAt = new Date();
    }
  }

  const updated = await prisma.hunt.update({
    where: { id },
    data,
    include: { entries: { orderBy: { position: "asc" } } },
  });

  return NextResponse.json(updated);
}

// DELETE /api/hunts/[id] — delete a hunt
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const selectedOwnerId = req.headers.get("x-owner-id");
  const userId = getEffectiveUserId(session.user, selectedOwnerId);

  const hunt = await prisma.hunt.findUnique({
    where: { id, userId },
  });
  if (!hunt) return notFound("Hunt not found");

  await prisma.hunt.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
