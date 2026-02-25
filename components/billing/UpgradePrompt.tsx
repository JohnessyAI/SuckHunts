"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

interface UpgradePromptProps {
  feature: string;
  requiredTier: "basic" | "pro";
}

export default function UpgradePrompt({
  feature,
  requiredTier,
}: UpgradePromptProps) {
  return (
    <div className="glass-card rounded-xl p-6 border border-white/5 text-center">
      <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
        <Lock className="w-6 h-6 text-red-500" />
      </div>
      <h3 className="font-outfit text-lg font-semibold mb-2">
        Upgrade to {requiredTier === "basic" ? "Basic" : "Pro"}
      </h3>
      <p className="text-sm text-gray-400 mb-4">
        {feature} requires the {requiredTier === "basic" ? "Basic" : "Pro"}{" "}
        plan.
      </p>
      <Link
        href="/billing"
        className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-105 shadow-lg shadow-red-500/25"
      >
        View Plans
      </Link>
    </div>
  );
}
