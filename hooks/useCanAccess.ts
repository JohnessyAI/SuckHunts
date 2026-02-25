"use client";

import { useSession } from "next-auth/react";
import { checkFeature, type Feature } from "@/lib/features";

export function useCanAccess(feature: Feature): {
  allowed: boolean;
  tier: string;
  loading: boolean;
} {
  const { data: session, status } = useSession();
  const tier = session?.user?.subscriptionTier ?? "free";

  return {
    allowed: checkFeature(tier, feature),
    tier,
    loading: status === "loading",
  };
}
