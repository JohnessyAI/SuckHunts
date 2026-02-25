import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession, unauthorized, notFound } from "@/lib/auth-helpers";

// PATCH /api/overlays/[id]/scenes/[sid] — update scene
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const { id: projectId, sid } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const project = await prisma.overlayProject.findUnique({
    where: { id: projectId, userId: session.user.id },
  });
  if (!project) return notFound("Project not found");

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.background !== undefined) data.background = body.background;
  if (body.transition !== undefined) data.transition = body.transition;
  if (body.transitionMs !== undefined) data.transitionMs = body.transitionMs;

  const scene = await prisma.overlayScene.update({
    where: { id: sid },
    data,
    include: { widgets: { orderBy: { zIndex: "asc" } } },
  });

  return NextResponse.json(scene);
}

// DELETE /api/overlays/[id]/scenes/[sid]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const { id: projectId, sid } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const project = await prisma.overlayProject.findUnique({
    where: { id: projectId, userId: session.user.id },
  });
  if (!project) return notFound("Project not found");

  await prisma.overlayScene.delete({ where: { id: sid } });
  return NextResponse.json({ ok: true });
}
