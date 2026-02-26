"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Sparkles, ChevronDown } from "lucide-react";
import Link from "next/link";
import { currencySymbol, SUPPORTED_CURRENCIES } from "@/lib/utils/format";

export default function CreateHuntPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startBalance, setStartBalance] = useState("");
  const [currency, setCurrency] = useState("USD");
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
      body: JSON.stringify({
        title: title.trim(),
        ...(description.trim() && { description: description.trim() }),
        ...(startBalance && { startBalance: parseFloat(startBalance) }),
        currency,
      }),
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

  const sym = currencySymbol(currency);

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
              Set up your bonus hunt
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

          <label className="block text-sm text-gray-400 mb-2">
            Description <span className="text-gray-600">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. High-vol bonus buys session"
            className="form-input mb-4"
          />

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Start Balance <span className="text-gray-600">(optional)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={startBalance}
                  onChange={(e) => setStartBalance(e.target.value)}
                  placeholder="0"
                  className="form-input pr-8"
                  step="0.01"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  {sym}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Currency
              </label>
              <div className="relative">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="form-input appearance-none pr-8 cursor-pointer"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                />
              </div>
            </div>
          </div>

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
