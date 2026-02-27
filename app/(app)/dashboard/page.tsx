"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Plus, Trophy, DollarSign, TrendingUp, Pencil, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

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

export default function DashboardPage() {
  const { data: session } = useSession();
  const [hunts, setHunts] = useState<Hunt[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/hunts")
      .then((r) => r.json())
      .then(setHunts)
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(huntId: string) {
    if (!confirm("Are you sure you want to delete this hunt? This cannot be undone.")) return;
    setDeleting(huntId);
    const res = await fetch(`/api/hunts/${huntId}`, { method: "DELETE" });
    if (res.ok) {
      setHunts((prev) => prev.filter((h) => h.id !== huntId));
    }
    setDeleting(null);
  }

  const totalHunts = hunts.length;
  const totalSpent = hunts.reduce((s, h) => s + (h.startBalance ? parseFloat(h.startBalance) : parseFloat(h.totalCost)), 0);
  const totalWon = hunts.reduce((s, h) => s + parseFloat(h.totalWon), 0);
  const profit = totalWon - totalSpent;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-outfit text-2xl font-bold">
            Welcome back{session?.user?.name ? `, ${session.user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Here&apos;s your bonus hunt overview
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Hunts", value: totalHunts.toString(), icon: Trophy, color: "text-red-500" },
          { label: "Total Spent", value: formatCurrency(totalSpent), icon: DollarSign, color: "text-yellow-500" },
          { label: "Total Won", value: formatCurrency(totalWon), icon: TrendingUp, color: "text-green-500" },
          {
            label: "Profit",
            value: formatCurrency(profit),
            icon: DollarSign,
            color: profit >= 0 ? "text-green-500" : "text-red-500",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass-card rounded-xl p-5 border border-white/5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500 uppercase tracking-wider">
                {stat.label}
              </span>
              <stat.icon size={16} className={stat.color} />
            </div>
            <p className={`font-outfit text-2xl font-bold ${stat.color}`}>
              {loading ? "—" : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Hunts */}
      <div className="glass-card rounded-xl border border-white/5">
        <div className="p-5 border-b border-white/5">
          <h2 className="font-outfit text-lg font-semibold">Recent Hunts</h2>
        </div>

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
            {hunts.slice(0, 10).map((hunt) => {
              const spent = hunt.startBalance ? parseFloat(hunt.startBalance) : parseFloat(hunt.totalCost);
              const profit = parseFloat(hunt.totalWon) - spent;
              return (
                <div
                  key={hunt.id}
                  className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  <Link
                    href={`/hunt/${hunt.id}`}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        hunt.status === "live"
                          ? "bg-red-500 animate-pulse"
                          : hunt.status === "completed"
                          ? "bg-green-500"
                          : "bg-gray-500"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {hunt.title}
                      </p>
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
                        hunt.status === "live"
                          ? "bg-red-500/10 text-red-400"
                          : hunt.status === "completed"
                          ? "bg-green-500/10 text-green-400"
                          : "bg-white/5 text-gray-400"
                      }`}
                    >
                      {hunt.status}
                    </div>
                    <div className="flex items-center gap-1 ml-2">
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
