import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession, unauthorized, notFound } from "@/lib/auth-helpers";

// PATCH /api/overlays/[id]/scenes/[sid]/widgets/[wid] — update widget
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sid: string; wid: string }> }
) {
  const { id: projectId, wid } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const project = await prisma.overlayProject.findUnique({
    where: { id: projectId, userId: session.user.id },
  });
  if (!project) return notFound("Project not found");

  const body = await req.json();
  const data: Record<string, unknown> = {};

  const fields = [
    "x", "y", "width", "height", "rotation", "zIndex",
    "visible", "locked", "opacity", "config", "label", "type",
  ];
  for (const field of fields) {
    if (body[field] !== undefined) data[field] = body[field];
  }

  const widget = await prisma.overlayWidget.update({
    where: { id: wid },
    data,
  });

  return NextResponse.json(widget);
}

// DELETE /api/overlays/[id]/scenes/[sid]/widgets/[wid]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; sid: string; wid: string }> }
) {
  const { id: projectId, wid } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const project = await prisma.overlayProject.findUnique({
    where: { id: projectId, userId: session.user.id },
  });
  if (!project) return notFound("Project not found");

  await prisma.overlayWidget.delete({ where: { id: wid } });
  return NextResponse.json({ ok: true });
}
