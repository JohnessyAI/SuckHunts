import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession, unauthorized, badRequest } from "@/lib/auth-helpers";
import { generateShareSlug } from "@/lib/utils/share-slug";

// GET /api/overlays — list user's overlay projects
export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const projects = await prisma.overlayProject.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { scenes: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(projects);
}

// POST /api/overlays — create a new overlay project
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const { name } = await req.json();
  if (!name?.trim()) return badRequest("Name is required");

  let slug = generateShareSlug(6);
  while (await prisma.overlayProject.findUnique({ where: { slug } })) {
    slug = generateShareSlug(6);
  }

  const project = await prisma.overlayProject.create({
    data: {
      userId: session.user.id,
      name: name.trim(),
      slug,
      scenes: {
        create: {
          name: "Default",
          slug: "default",
          position: 0,
        },
      },
    },
    include: { scenes: { include: { widgets: true } } },
  });

  // Set active scene to the default one
  await prisma.overlayProject.update({
    where: { id: project.id },
    data: { activeSceneId: project.scenes[0].id },
  });

  return NextResponse.json(project, { status: 201 });
}
