import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notFound } from "@/lib/auth-helpers";

// GET /api/hunts/[id]/public — public hunt data (no auth needed)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const hunt = await prisma.hunt.findUnique({
    where: { id },
    include: {
      entries: { orderBy: { position: "asc" } },
      user: { select: { name: true, image: true } },
    },
  });

  if (!hunt) return notFound("Hunt not found");

  return NextResponse.json(hunt);
}
