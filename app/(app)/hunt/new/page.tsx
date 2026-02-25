"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";

export default function CreateHuntPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError("");

    const res = await fetch("/api/hunts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to create hunt");
      setLoading(false);
      return;
    }

    const hunt = await res.json();
    router.push(`/hunt/${hunt.id}`);
  };

  return (
    <div className="max-w-lg mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to Dashboard
      </Link>

      <div className="glass-card rounded-xl p-6 sm:p-8 border border-white/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="font-outfit text-xl font-bold">Create New Hunt</h1>
            <p className="text-sm text-gray-500">
              Give your hunt a name to get started
            </p>
          </div>
        </div>

        <form onSubmit={handleCreate}>
          <label className="block text-sm text-gray-400 mb-2">
            Hunt Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Tuesday Night Hunt"
            className="form-input mb-4"
            autoFocus
          />

          {error && (
            <p className="text-sm text-red-400 mb-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:from-gray-700 disabled:to-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] shadow-lg shadow-red-500/25"
          >
            {loading ? "Creating..." : "Create Hunt"}
          </button>
        </form>
      </div>
    </div>
  );
}
