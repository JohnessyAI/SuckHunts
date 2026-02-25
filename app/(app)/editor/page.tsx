"use client";

import { Layers } from "lucide-react";

export default function EditorPage() {
  return (
    <div>
      <h1 className="font-outfit text-2xl font-bold mb-2">Overlay Editor</h1>
      <p className="text-sm text-gray-500 mb-8">
        Build custom OBS overlays with scenes and widgets
      </p>

      <div className="glass-card rounded-xl p-12 border border-white/5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Layers className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="font-outfit text-lg font-semibold mb-2">Coming Soon</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Drag-and-drop overlay editor with custom scenes, widgets, chat bot
          commands, and mod dashboard — all through a single OBS URL.
        </p>
      </div>
    </div>
  );
}
