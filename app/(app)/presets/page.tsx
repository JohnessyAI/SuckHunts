"use client";

import { BookMarked } from "lucide-react";

export default function PresetsPage() {
  return (
    <div>
      <h1 className="font-outfit text-2xl font-bold mb-2">Presets</h1>
      <p className="text-sm text-gray-500 mb-8">
        Saved game lists for quick hunt setup
      </p>

      <div className="glass-card rounded-xl p-12 border border-white/5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <BookMarked className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="font-outfit text-lg font-semibold mb-2">Coming Soon</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Save your favourite game combinations as presets and load them into new hunts instantly.
        </p>
      </div>
    </div>
  );
}
