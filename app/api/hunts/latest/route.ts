import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession, unauthorized } from "@/lib/auth-helpers";

// GET /api/hunts/latest — get the user's most recent hunt with entries
export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const hunt = await prisma.hunt.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      entries: { orderBy: { position: "asc" } },
    },
  });

  if (!hunt) return NextResponse.json(null);

  return NextResponse.json(hunt);
}
