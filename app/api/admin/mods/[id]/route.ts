import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession, unauthorized, notFound } from "@/lib/auth-helpers";

// DELETE /api/admin/mods/[id] — remove mod from this admin's roster
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getAuthSession();
  if (!session?.user?.isAdmin) return unauthorized();

  const mod = await prisma.user.findUnique({ where: { id } });
  if (!mod || !mod.isMod) return notFound("Mod not found");
  if (!mod.ownerIds.includes(session.user.id)) return notFound("Mod not found");

  const newOwnerIds = mod.ownerIds.filter((oid) => oid !== session.user.id);

  if (newOwnerIds.length === 0) {
    // No more owners — delete the mod account entirely
    await prisma.user.delete({ where: { id } });
  } else {
    // Still has other owners — just remove this admin
    await prisma.user.update({
      where: { id },
      data: { ownerIds: newOwnerIds },
    });
  }

  return NextResponse.json({ success: true });
}
