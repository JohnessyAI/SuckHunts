import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "@/lib/auth-helpers";

// GET /api/overlays/[id]/public — public overlay data (for OBS)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Try finding by ID first, then by slug
  const project = await prisma.overlayProject.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      scenes: {
        include: { widgets: { orderBy: { zIndex: "asc" } } },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!project) return notFound("Overlay not found");

  // Auto-resolve active hunt: use activeHuntId if set, otherwise find the user's live hunt
  let activeHuntId = project.activeHuntId;
  if (!activeHuntId) {
    const liveHunt = await prisma.hunt.findFirst({
      where: { userId: project.userId, status: "live" },
      select: { id: true },
    });
    if (liveHunt) activeHuntId = liveHunt.id;
  }

  return NextResponse.json({ ...project, activeHuntId });
}
