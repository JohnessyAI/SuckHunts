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
    onboardingDone: true,
  },
  expires: "2099-01-01T00:00:00.000Z",
};

export async function getAuthSession() {
  // TODO: Remove dev bypass before production
  if (process.env.NODE_ENV === "development") {
    return DEV_SESSION;
  }
  return getServerSession(authOptions);
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
