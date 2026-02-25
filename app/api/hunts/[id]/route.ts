import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthSession,
  unauthorized,
  notFound,
  badRequest,
} from "@/lib/auth-helpers";

// GET /api/hunts/[id] — get a single hunt with entries
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const hunt = await prisma.hunt.findUnique({
    where: { id, userId: session.user.id },
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

  const hunt = await prisma.hunt.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!hunt) return notFound("Hunt not found");

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = body.title.trim();
  if (body.status !== undefined) {
    if (!["preparing", "live", "completed"].includes(body.status)) {
      return badRequest("Invalid status");
    }
    data.status = body.status;
    if (body.status === "live" && !hunt.startedAt) {
      data.startedAt = new Date();
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
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const hunt = await prisma.hunt.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!hunt) return notFound("Hunt not found");

  await prisma.hunt.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
