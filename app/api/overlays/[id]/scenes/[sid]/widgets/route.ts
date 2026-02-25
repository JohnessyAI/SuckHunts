import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession, unauthorized, notFound, badRequest } from "@/lib/auth-helpers";

// POST /api/overlays/[id]/scenes/[sid]/widgets — add widget to scene
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const { id: projectId, sid: sceneId } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const project = await prisma.overlayProject.findUnique({
    where: { id: projectId, userId: session.user.id },
  });
  if (!project) return notFound("Project not found");

  const body = await req.json();
  if (!body.type) return badRequest("Widget type is required");

  // Get max zIndex for this scene
  const maxZ = await prisma.overlayWidget.findFirst({
    where: { sceneId },
    orderBy: { zIndex: "desc" },
    select: { zIndex: true },
  });

  const widget = await prisma.overlayWidget.create({
    data: {
      sceneId,
      type: body.type,
      label: body.label || body.type,
      x: body.x ?? 50,
      y: body.y ?? 50,
      width: body.width ?? 400,
      height: body.height ?? 200,
      zIndex: (maxZ?.zIndex ?? -1) + 1,
      config: body.config ?? {},
    },
  });

  return NextResponse.json(widget, { status: 201 });
}
