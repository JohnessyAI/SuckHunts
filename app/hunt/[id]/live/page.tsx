"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatCurrency, formatMultiplier } from "@/lib/utils/format";
import { Trophy, DollarSign, TrendingUp, BarChart3 } from "lucide-react";

interface HuntEntry {
  id: string;
  gameName: string;
  gameImage: string | null;
  gameProvider: string | null;
  betSize: string;
  cost: string;
  result: string | null;
  multiplier: string | null;
  position: number;
  status: string;
}

interface Hunt {
  id: string;
  title: string;
  description: string | null;
  status: string;
  startBalance: string | null;
  totalCost: string;
  totalWon: string;
  currency: string;
  entries: HuntEntry[];
  user: { name: string; image: string | null };
}

export default function PublicViewerPage() {
  const params = useParams();
  const huntId = params.id as string;
  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = () => {
      fetch(`/api/hunts/${huntId}/public`)
        .then((r) => (r.ok ? r.json() : null))
        .then(setHunt)
        .finally(() => setLoading(false));
    };

    fetchData();
    // Poll for updates every 3 seconds while live
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [huntId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-gray-500">
        Loading hunt...
      </div>
    );
  }

  if (!hunt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-gray-500">
        Hunt not found
      </div>
    );
  }

  const cur = hunt.currency || "USD";
  const completedEntries = hunt.entries.filter((e) => e.status === "completed");
  const completed = completedEntries.length;
  const totalCost = completedEntries.reduce((s, e) => s + parseFloat(e.cost), 0);
  const totalWon = completedEntries.reduce((s, e) => s + (e.result ? parseFloat(e.result) : 0), 0);
  const profit = totalWon - totalCost;
  const avgMultiplier =
    completed > 0
      ? completedEntries
          .filter((e) => e.multiplier)
          .reduce((s, e) => s + parseFloat(e.multiplier!), 0) / completed
      : 0;
  const bestEntry = hunt.entries
    .filter((e) => e.multiplier)
    .sort((a, b) => parseFloat(b.multiplier!) - parseFloat(a.multiplier!))[0];

  return (
    <main className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {hunt.status === "live" && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-red-400 font-medium">LIVE</span>
                </span>
              )}
              <div>
                <h1 className="font-outfit text-lg font-bold text-white">
                  {hunt.title}
                </h1>
                <p className="text-xs text-gray-500">
                  by {hunt.user.name} &middot; {hunt.entries.length} games
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase">Profit</p>
                <p
                  className={`font-outfit text-lg font-bold ${
                    profit >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {profit >= 0 ? "+" : ""}
                  {formatCurrency(profit, cur)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Cost", value: formatCurrency(totalCost, cur), icon: DollarSign, color: "text-white" },
            { label: "Won", value: formatCurrency(totalWon, cur), icon: TrendingUp, color: "text-green-400" },
            {
              label: "Profit",
              value: `${profit >= 0 ? "+" : ""}${formatCurrency(profit, cur)}`,
              icon: DollarSign,
              color: profit >= 0 ? "text-green-400" : "text-red-400",
            },
            { label: "Avg Multi", value: formatMultiplier(avgMultiplier), icon: BarChart3, color: "text-yellow-400" },
            {
              label: "Best",
              value: bestEntry ? formatMultiplier(bestEntry.multiplier!) : "—",
              icon: Trophy,
              color: "text-yellow-400",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass-card rounded-lg p-3 border border-white/5 text-center"
            >
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                {stat.label}
              </p>
              <p className={`font-outfit text-base font-bold ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>
              {completed} / {hunt.entries.length} completed
            </span>
            <span>
              {hunt.entries.length > 0
                ? Math.round((completed / hunt.entries.length) * 100)
                : 0}
              %
            </span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-red-500 rounded-full transition-all duration-500"
              style={{
                width: `${
                  hunt.entries.length > 0
                    ? (completed / hunt.entries.length) * 100
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* Entries Grid */}
        <div className="space-y-1.5">
          {hunt.entries.map((entry, i) => {
            const isWin =
              entry.result && parseFloat(entry.result) > parseFloat(entry.cost);
            return (
              <div
                key={entry.id}
                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm ${
                  entry.status === "playing"
                    ? "bg-red-500/10 border border-red-500/20"
                    : entry.status === "completed"
                    ? "bg-white/[0.02]"
                    : "bg-white/[0.01] opacity-50"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-gray-600 w-6 text-right flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`truncate font-medium ${
                        entry.status === "playing" ? "text-white" : "text-gray-300"
                      }`}
                    >
                      {entry.gameName}
                    </p>
                    {entry.gameProvider && (
                      <p className="text-[10px] text-gray-600">{entry.gameProvider}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6 flex-shrink-0 text-xs">
                  <span className="text-gray-500 w-14 text-right">
                    {formatCurrency(entry.betSize, cur)}
                  </span>
                  <span className="text-white w-16 text-right">
                    {formatCurrency(entry.cost, cur)}
                  </span>
                  <span
                    className={`w-20 text-right font-medium ${
                      entry.result
                        ? isWin
                          ? "text-green-400"
                          : "text-red-400"
                        : "text-gray-600"
                    }`}
                  >
                    {entry.result ? formatCurrency(entry.result, cur) : "—"}
                  </span>
                  <span
                    className={`w-14 text-right ${
                      entry.status === "playing"
                        ? "text-red-400 animate-pulse font-medium"
                        : entry.multiplier
                        ? "text-yellow-400"
                        : "text-gray-600"
                    }`}
                  >
                    {entry.status === "playing"
                      ? "LIVE"
                      : entry.multiplier
                      ? formatMultiplier(entry.multiplier)
                      : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 mt-12">
        <div className="max-w-5xl mx-auto px-4 py-6 text-center">
          <p className="text-xs text-gray-600">
            Powered by{" "}
            <a
              href="/"
              className="text-gray-500 hover:text-white transition-colors"
            >
              BonusHunt Tracker
            </a>{" "}
            by Sucks Media
          </p>
        </div>
      </div>
    </main>
  );
}
