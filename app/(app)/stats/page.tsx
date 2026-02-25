"use client";

import { BarChart3 } from "lucide-react";

export default function StatsPage() {
  return (
    <div>
      <h1 className="font-outfit text-2xl font-bold mb-2">Statistics</h1>
      <p className="text-sm text-gray-500 mb-8">
        Your performance across all hunts
      </p>

      <div className="glass-card rounded-xl p-12 border border-white/5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="font-outfit text-lg font-semibold mb-2">Coming Soon</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Detailed statistics with per-game breakdowns, win rates, ROI tracking,
          and performance trends will be available here.
        </p>
      </div>
    </div>
  );
}
