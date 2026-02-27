"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

const devSession: Session = {
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

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Remove dev bypass before production
  const isDev = process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

  return (
    <SessionProvider session={isDev ? devSession : undefined}>
      {children}
    </SessionProvider>
  );
}
