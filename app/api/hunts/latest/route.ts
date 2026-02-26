import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession, unauthorized } from "@/lib/auth-helpers";

// GET /api/hunts/latest — get the user's active (live) hunt, or most recent
export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  // Prefer the active live hunt
  let hunt = await prisma.hunt.findFirst({
    where: { userId: session.user.id, status: "live" },
    include: {
      entries: { orderBy: { position: "asc" } },
    },
  });

  // Fall back to most recent hunt
  if (!hunt) {
    hunt = await prisma.hunt.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        entries: { orderBy: { position: "asc" } },
      },
    });
  }

  if (!hunt) return NextResponse.json(null);

  return NextResponse.json(hunt);
}
