import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

const DEV_SESSION = {
  user: {
    id: "13516860-12e6-4ef9-a774-6ec9e13c0b5b",
    name: "Dev User",
    email: "dev@sucksmedia.com",
    image: null,
    subscriptionTier: "pro",
    isAdmin: true,
    isMod: false,
    ownerIds: [],
    onboardingDone: true,
  },
  expires: "2099-01-01T00:00:00.000Z",
};

export async function getAuthSession() {
  // TODO: Remove dev bypass before production
  if (process.env.DEV_BYPASS_AUTH === "true") {
    return DEV_SESSION;
  }
  return getServerSession(authOptions);
}

/**
 * For mods, returns the ownerId they're acting on behalf of.
 * For regular users/admins, returns their own id.
 * Mods must pass selectedOwnerId when they have multiple owners.
 */
export function getEffectiveUserId(
  user: { id: string; isMod: boolean; ownerIds: string[] },
  selectedOwnerId?: string | null
): string {
  if (!user.isMod || user.ownerIds.length === 0) {
    return user.id;
  }
  // If a specific owner is selected, validate it's in the list
  if (selectedOwnerId && user.ownerIds.includes(selectedOwnerId)) {
    return selectedOwnerId;
  }
  // Default to first owner
  return user.ownerIds[0];
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}
