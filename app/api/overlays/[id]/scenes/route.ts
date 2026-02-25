import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession, unauthorized, notFound, badRequest } from "@/lib/auth-helpers";

// POST /api/overlays/[id]/scenes — create a new scene
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const project = await prisma.overlayProject.findUnique({
    where: { id: projectId, userId: session.user.id },
    include: { _count: { select: { scenes: true } } },
  });
  if (!project) return notFound("Project not found");

  const { name } = await req.json();
  if (!name?.trim()) return badRequest("Name is required");

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const scene = await prisma.overlayScene.create({
    data: {
      projectId,
      name: name.trim(),
      slug,
      position: project._count.scenes,
    },
    include: { widgets: true },
  });

  return NextResponse.json(scene, { status: 201 });
}
