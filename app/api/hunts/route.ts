import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession, unauthorized, badRequest } from "@/lib/auth-helpers";
import { generateShareSlug } from "@/lib/utils/share-slug";
import { checkFeature, HUNT_LIMITS, type SubscriptionTier } from "@/lib/features";

// GET /api/hunts — list user's hunts
export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const hunts = await prisma.hunt.findMany({
    where: { userId: session.user.id },
    include: { _count: { select: { entries: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(hunts);
}

// POST /api/hunts — create a new hunt
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const { title, description, startBalance, currency } = await req.json();
  if (!title?.trim()) return badRequest("Title is required");

  // Check hunt limit for free tier
  const tier = session.user.subscriptionTier as SubscriptionTier;
  const limit = HUNT_LIMITS[tier];

  if (limit !== Infinity) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { huntsThisMonth: true, huntsResetAt: true },
    });

    if (user) {
      // Reset counter if it's a new month
      const now = new Date();
      const resetAt = user.huntsResetAt;
      if (!resetAt || resetAt.getMonth() !== now.getMonth()) {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { huntsThisMonth: 0, huntsResetAt: now },
        });
      } else if (user.huntsThisMonth >= limit) {
        return badRequest(
          `Free plan limited to ${limit} hunts per month. Upgrade for unlimited hunts.`
        );
      }
    }
  }

  // Generate unique share slug
  let shareSlug = generateShareSlug();
  while (await prisma.hunt.findUnique({ where: { shareSlug } })) {
    shareSlug = generateShareSlug();
  }

  const hunt = await prisma.hunt.create({
    data: {
      userId: session.user.id,
      title: title.trim(),
      shareSlug,
      ...(description && { description: description.trim() }),
      ...(startBalance != null && { startBalance: parseFloat(startBalance) }),
      ...(currency && { currency }),
    },
  });

  // Increment monthly hunt counter
  await prisma.user.update({
    where: { id: session.user.id },
    data: { huntsThisMonth: { increment: 1 } },
  });

  return NextResponse.json(hunt, { status: 201 });
}
