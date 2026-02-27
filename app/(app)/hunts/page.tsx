"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Power } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { useOwner } from "@/lib/owner-context";
import { apiFetch } from "@/lib/api-fetch";

interface Hunt {
  id: string;
  title: string;
  status: string;
  totalCost: string;
  totalWon: string;
  startBalance: string | null;
  shareSlug: string;
  createdAt: string;
  _count: { entries: number };
}

export default function HuntsPage() {
  const { selectedOwnerId } = useOwner();
  const [hunts, setHunts] = useState<Hunt[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/hunts", undefined, selectedOwnerId)
      .then((r) => r.json())
      .then(setHunts)
      .finally(() => setLoading(false));
  }, [selectedOwnerId]);

  async function handleDelete(huntId: string) {
    if (!confirm("Are you sure you want to delete this hunt? This cannot be undone.")) return;
    setDeleting(huntId);
    const res = await apiFetch(`/api/hunts/${huntId}`, { method: "DELETE" }, selectedOwnerId);
    if (res.ok) {
      setHunts((prev) => prev.filter((h) => h.id !== huntId));
    }
    setDeleting(null);
  }

  async function handleToggleActive(hunt: Hunt) {
    const newStatus = hunt.status === "live" ? "preparing" : "live";
    setToggling(hunt.id);
    const res = await apiFetch(`/api/hunts/${hunt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    }, selectedOwnerId);
    if (res.ok) {
      // If activating, deactivate all others locally too
      setHunts((prev) =>
        prev.map((h) => {
          if (h.id === hunt.id) return { ...h, status: newStatus };
          if (newStatus === "live" && h.status === "live") return { ...h, status: "completed" };
          return h;
        })
      );
    }
    setToggling(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-outfit text-2xl font-bold">Hunts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your bonus hunts. Only one hunt can be active at a time.
          </p>
        </div>
        <Link
          href="/hunt/new"
          className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-105 shadow-lg shadow-red-500/25"
        >
          <Plus size={16} />
          New Hunt
        </Link>
      </div>

      <div className="glass-card rounded-xl border border-white/5">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : hunts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">No hunts yet. Create your first one!</p>
            <Link
              href="/hunt/new"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium"
            >
              <Plus size={16} />
              Create Hunt
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {hunts.map((hunt) => {
              const spent = hunt.startBalance ? parseFloat(hunt.startBalance) : parseFloat(hunt.totalCost);
              const profit = parseFloat(hunt.totalWon) - spent;
              const isLive = hunt.status === "live";
              return (
                <div
                  key={hunt.id}
                  className={`flex items-center justify-between px-5 py-4 transition-colors ${
                    isLive ? "bg-red-500/5" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <Link
                    href={`/hunt/${hunt.id}`}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        isLive
                          ? "bg-red-500 animate-pulse"
                          : hunt.status === "completed"
                          ? "bg-green-500"
                          : "bg-gray-500"
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">
                          {hunt.title}
                        </p>
                        {isLive && (
                          <span className="text-[10px] uppercase font-bold tracking-wider text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {hunt._count.entries} games &middot;{" "}
                        {new Date(hunt.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-6 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Cost</p>
                      <p className="text-sm text-white">
                        {formatCurrency(spent)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Profit</p>
                      <p
                        className={`text-sm font-medium ${
                          profit >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {profit >= 0 ? "+" : ""}
                        {formatCurrency(profit)}
                      </p>
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        isLive
                          ? "bg-red-500/10 text-red-400"
                          : hunt.status === "completed"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-white/5 text-gray-400"
                      }`}
                    >
                      {hunt.status}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleToggleActive(hunt)}
                        disabled={toggling === hunt.id}
                        className={`p-1.5 rounded-md transition-colors disabled:opacity-50 ${
                          isLive
                            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            : "text-gray-400 hover:bg-green-500/20 hover:text-green-400"
                        }`}
                        title={isLive ? "Deactivate hunt" : "Set as active hunt"}
                      >
                        <Power size={14} />
                      </button>
                      <Link
                        href={`/hunt/${hunt.id}`}
                        className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                        title="Edit hunt"
                      >
                        <Pencil size={14} />
                      </Link>
                      <button
                        onClick={() => handleDelete(hunt.id)}
                        disabled={deleting === hunt.id}
                        className="p-1.5 rounded-md hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                        title="Delete hunt"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
