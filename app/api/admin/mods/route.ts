import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession, unauthorized, badRequest } from "@/lib/auth-helpers";
import bcrypt from "bcryptjs";

// GET /api/admin/mods — list mods assigned to this admin
export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.isAdmin) return unauthorized();

  const mods = await prisma.user.findMany({
    where: {
      isMod: true,
      ownerIds: { has: session.user.id },
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(mods);
}

// POST /api/admin/mods — create a new mod or add this admin to existing mod
export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.isAdmin) return unauthorized();

  const { email, password, name } = await req.json();

  if (!name?.trim()) return badRequest("Name is required");
  if (!email?.trim()) return badRequest("Email is required");
  if (!password || password.length < 8)
    return badRequest("Password must be at least 8 characters");

  const emailLower = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email: emailLower },
  });

  if (existing) {
    // If already a mod, add this admin to their ownerIds
    if (existing.isMod) {
      if (existing.ownerIds.includes(session.user.id)) {
        return badRequest("This mod is already assigned to you");
      }
      const mod = await prisma.user.update({
        where: { id: existing.id },
        data: { ownerIds: { push: session.user.id } },
        select: { id: true, name: true, email: true, createdAt: true },
      });
      return NextResponse.json(mod, { status: 201 });
    }
    // Regular user exists with this email — can't convert
    return badRequest("A user with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const mod = await prisma.user.create({
    data: {
      email: emailLower,
      name: name.trim(),
      password: hashedPassword,
      isMod: true,
      ownerIds: [session.user.id],
      onboardingDone: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  return NextResponse.json(mod, { status: 201 });
}
