import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession, unauthorized } from "@/lib/auth-helpers";

// GET /api/admin/streamers — resolve ownerIds to streamer names (for mods)
export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  if (!session.user.isMod || session.user.ownerIds.length === 0) {
    return NextResponse.json([]);
  }

  const owners = await prisma.user.findMany({
    where: { id: { in: session.user.ownerIds } },
    select: { id: true, name: true, image: true },
  });

  return NextResponse.json(owners);
}
