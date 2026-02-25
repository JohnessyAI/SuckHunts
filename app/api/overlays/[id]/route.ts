import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession, unauthorized, notFound } from "@/lib/auth-helpers";

// GET /api/overlays/[id] — get overlay project with scenes and widgets
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const project = await prisma.overlayProject.findUnique({
    where: { id, userId: session.user.id },
    include: {
      scenes: {
        include: { widgets: { orderBy: { zIndex: "asc" } } },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!project) return notFound("Project not found");
  return NextResponse.json(project);
}

// PATCH /api/overlays/[id] — update project settings
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const project = await prisma.overlayProject.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!project) return notFound("Project not found");

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.activeSceneId !== undefined) data.activeSceneId = body.activeSceneId;
  if (body.activeHuntId !== undefined) data.activeHuntId = body.activeHuntId;

  const updated = await prisma.overlayProject.update({
    where: { id },
    data,
    include: {
      scenes: {
        include: { widgets: { orderBy: { zIndex: "asc" } } },
        orderBy: { position: "asc" },
      },
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/overlays/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const project = await prisma.overlayProject.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!project) return notFound("Project not found");

  await prisma.overlayProject.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
