"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Play,
  Square,
  Trash2,
  Copy,
  ExternalLink,
  X,
  Search,
} from "lucide-react";
import { formatCurrency, formatMultiplier } from "@/lib/utils/format";

interface GameResult {
  slug: string;
  name: string;
  provider: string;
  imageUrl: string | null;
  rtp: string | null;
  volatility: string | null;
  maxWin: string | null;
}

interface HuntEntry {
  id: string;
  gameName: string;
  gameSlug: string | null;
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
  status: string;
  totalCost: string;
  totalWon: string;
  shareSlug: string;
  entries: HuntEntry[];
}

export default function HuntControlPanel() {
  const params = useParams();
  const router = useRouter();
  const huntId = params.id as string;

  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [loading, setLoading] = useState(true);

  // Add entry form
  const [showAdd, setShowAdd] = useState(false);
  const [gameName, setGameName] = useState("");
  const [betSize, setBetSize] = useState("");
  const [cost, setCost] = useState("");
  const [adding, setAdding] = useState(false);

  // Game search
  const [searchResults, setSearchResults] = useState<GameResult[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Result recording
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [resultValue, setResultValue] = useState("");

  const fetchHunt = useCallback(async () => {
    const res = await fetch(`/api/hunts/${huntId}`);
    if (!res.ok) {
      router.push("/dashboard");
      return;
    }
    setHunt(await res.json());
    setLoading(false);
  }, [huntId, router]);

  useEffect(() => {
    fetchHunt();
  }, [fetchHunt]);

  // Game search with debounce
  const searchGames = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/games/search?q=${encodeURIComponent(query)}&limit=8`);
      if (res.ok) {
        const results = await res.json();
        setSearchResults(results);
        setShowResults(results.length > 0);
      }
    }, 80);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectGame = (game: GameResult) => {
    setGameName(game.name);
    setSelectedGame(game);
    setShowResults(false);
    setSearchResults([]);
  };

  const clearSelectedGame = () => {
    setSelectedGame(null);
    setGameName("");
  };

  const addEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameName.trim() || !cost) return;
    setAdding(true);

    await fetch(`/api/hunts/${huntId}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameName: gameName.trim(),
        gameSlug: selectedGame?.slug || null,
        gameImage: selectedGame?.imageUrl || null,
        gameProvider: selectedGame?.provider || null,
        betSize: parseFloat(betSize) || parseFloat(cost),
        cost: parseFloat(cost),
      }),
    });

    setGameName("");
    setBetSize("");
    setCost("");
    setSelectedGame(null);
    setShowAdd(false);
    setAdding(false);
    fetchHunt();
  };

  const recordResult = async (entryId: string) => {
    if (!resultValue) return;
    await fetch(`/api/hunts/${huntId}/entries/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result: parseFloat(resultValue) }),
    });
    setRecordingId(null);
    setResultValue("");
    fetchHunt();
  };

  const setPlaying = async (entryId: string) => {
    await fetch(`/api/hunts/${huntId}/entries/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "playing" }),
    });
    fetchHunt();
  };

  const deleteEntry = async (entryId: string) => {
    await fetch(`/api/hunts/${huntId}/entries/${entryId}`, {
      method: "DELETE",
    });
    fetchHunt();
  };

  const updateHuntStatus = async (status: string) => {
    await fetch(`/api/hunts/${huntId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchHunt();
  };

  const copyShareLink = () => {
    if (!hunt) return;
    const url = `${window.location.origin}/hunt/${hunt.id}/live`;
    navigator.clipboard.writeText(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        Loading hunt...
      </div>
    );
  }

  if (!hunt) return null;

  const totalCost = parseFloat(hunt.totalCost);
  const totalWon = parseFloat(hunt.totalWon);
  const profit = totalWon - totalCost;
  const completed = hunt.entries.filter((e) => e.status === "completed").length;
  const avgMultiplier =
    completed > 0
      ? hunt.entries
          .filter((e) => e.multiplier)
          .reduce((s, e) => s + parseFloat(e.multiplier!), 0) / completed
      : 0;

  return (
    <div>
      {/* Header */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft size={16} />
        Dashboard
      </Link>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-outfit text-2xl font-bold">{hunt.title}</h1>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                hunt.status === "live"
                  ? "bg-red-500/10 text-red-400"
                  : hunt.status === "completed"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-white/5 text-gray-400"
              }`}
            >
              {hunt.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {hunt.entries.length} games &middot; {completed} completed
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hunt.status === "preparing" && (
            <button
              onClick={() => updateHuntStatus("live")}
              className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:scale-105 transition-all shadow-lg shadow-red-500/25"
            >
              <Play size={14} />
              Go Live
            </button>
          )}
          {hunt.status === "live" && (
            <button
              onClick={() => updateHuntStatus("completed")}
              className="flex items-center gap-2 bg-white/5 border border-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-all"
            >
              <Square size={14} />
              End Hunt
            </button>
          )}
          <button
            onClick={copyShareLink}
            className="flex items-center gap-2 bg-white/5 border border-white/10 text-gray-400 px-4 py-2 rounded-lg text-sm hover:text-white hover:bg-white/10 transition-all"
            title="Copy viewer link"
          >
            <Copy size={14} />
            Share
          </button>
          <Link
            href={`/hunt/${hunt.id}/live`}
            target="_blank"
            className="flex items-center gap-2 bg-white/5 border border-white/10 text-gray-400 px-4 py-2 rounded-lg text-sm hover:text-white hover:bg-white/10 transition-all"
          >
            <ExternalLink size={14} />
            View
          </Link>
        </div>
      </div>

      {/* Running Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Cost", value: formatCurrency(totalCost), color: "text-white" },
          { label: "Total Won", value: formatCurrency(totalWon), color: "text-green-400" },
          {
            label: "Profit",
            value: `${profit >= 0 ? "+" : ""}${formatCurrency(profit)}`,
            color: profit >= 0 ? "text-green-400" : "text-red-400",
          },
          { label: "Avg Multi", value: formatMultiplier(avgMultiplier), color: "text-yellow-400" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass-card rounded-lg p-3 border border-white/5 text-center"
          >
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
              {stat.label}
            </p>
            <p className={`font-outfit text-lg font-bold ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Add Game Form */}
      {showAdd && (
        <form
          onSubmit={addEntry}
          className="glass-card rounded-xl border border-white/5 p-4 mb-3"
        >
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="relative sm:col-span-2" ref={dropdownRef}>
                {selectedGame ? (
                  <div className="form-input flex items-center gap-2">
                    {selectedGame.imageUrl && (
                      <img
                        src={selectedGame.imageUrl}
                        alt=""
                        className="w-8 h-8 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <span className="truncate text-white text-sm flex-1">
                      {selectedGame.name}
                    </span>
                    <span className="text-[10px] text-gray-500 flex-shrink-0">
                      {selectedGame.provider}
                    </span>
                    <button
                      type="button"
                      onClick={clearSelectedGame}
                      className="text-gray-500 hover:text-white flex-shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={gameName}
                      onChange={(e) => {
                        setGameName(e.target.value);
                        searchGames(e.target.value);
                      }}
                      placeholder="Search games..."
                      className="form-input pl-9 w-full"
                      autoFocus
                    />
                  </div>
                )}

                {/* Search Results Dropdown */}
                {showResults && searchResults.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                    {searchResults.map((game) => (
                      <button
                        key={game.slug}
                        type="button"
                        onClick={() => selectGame(game)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                      >
                        {game.imageUrl ? (
                          <img
                            src={game.imageUrl}
                            alt=""
                            className="w-10 h-10 rounded object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-white/5 flex-shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white truncate">{game.name}</p>
                          <p className="text-[10px] text-gray-500">{game.provider}</p>
                        </div>
                        {game.rtp && (
                          <span className="text-[10px] text-gray-500 flex-shrink-0">
                            {game.rtp}% RTP
                          </span>
                        )}
                      </button>
                    ))}
                    {/* Quick add option for unlisted games */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowResults(false);
                        setSearchResults([]);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors text-left border-t border-white/5"
                    >
                      <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center flex-shrink-0">
                        <Plus size={14} className="text-gray-500" />
                      </div>
                      <p className="text-sm text-gray-400">
                        Use &quot;{gameName}&quot; as custom name
                      </p>
                    </button>
                  </div>
                )}
              </div>
              <input
                type="number"
                value={betSize}
                onChange={(e) => setBetSize(e.target.value)}
                placeholder="Bet size"
                className="form-input"
                step="0.01"
              />
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="Bonus cost"
                className="form-input"
                step="0.01"
                required
              />
            </div>
            <button
              type="submit"
              disabled={adding || !gameName.trim() || !cost}
              className="mt-3 bg-gradient-to-r from-red-600 to-red-500 disabled:from-gray-700 disabled:to-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
            >
              {adding ? "Adding..." : "Add to Hunt"}
            </button>
        </form>
      )}

      {/* Entries Table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="font-outfit font-semibold">Games</h2>
          {hunt.status !== "completed" && (
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-400 transition-colors"
            >
              {showAdd ? <X size={14} /> : <Plus size={14} />}
              {showAdd ? "Cancel" : "Add Game"}
            </button>
          )}
        </div>

        {/* Entry List */}
        {hunt.entries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No games added yet. Click &quot;Add Game&quot; to get started.
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] text-gray-500 uppercase tracking-wider">
              <div className="col-span-1">#</div>
              <div className="col-span-4">Game</div>
              <div className="col-span-1 text-right">Bet</div>
              <div className="col-span-2 text-right">Cost</div>
              <div className="col-span-2 text-right">Result</div>
              <div className="col-span-1 text-right">Multi</div>
              <div className="col-span-1" />
            </div>

            {hunt.entries.map((entry, i) => (
              <div
                key={entry.id}
                className={`grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm ${
                  entry.status === "playing"
                    ? "bg-red-500/5 border-l-2 border-red-500"
                    : entry.status === "completed"
                    ? "opacity-80"
                    : ""
                }`}
              >
                <div className="col-span-1 text-gray-500 text-xs">
                  {i + 1}
                </div>
                <div className="col-span-4 flex items-center gap-2 min-w-0">
                  {entry.gameImage ? (
                    <img
                      src={entry.gameImage}
                      alt=""
                      className="w-9 h-9 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded bg-white/5 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <span className="truncate text-white font-medium block text-sm">
                      {entry.gameName}
                    </span>
                    {entry.gameProvider && (
                      <span className="text-[10px] text-gray-600 block">
                        {entry.gameProvider}
                      </span>
                    )}
                  </div>
                </div>
                <div className="col-span-1 text-right text-gray-400">
                  ${parseFloat(entry.betSize).toFixed(2)}
                </div>
                <div className="col-span-2 text-right text-white">
                  {formatCurrency(entry.cost)}
                </div>
                <div className="col-span-2 text-right">
                  {recordingId === entry.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        recordResult(entry.id);
                      }}
                      className="flex items-center gap-1 justify-end"
                    >
                      <input
                        type="number"
                        value={resultValue}
                        onChange={(e) => setResultValue(e.target.value)}
                        className="w-20 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-right text-white"
                        step="0.01"
                        autoFocus
                        placeholder="0.00"
                      />
                      <button
                        type="submit"
                        className="text-green-400 hover:text-green-300 text-xs"
                      >
                        OK
                      </button>
                    </form>
                  ) : entry.result !== null ? (
                    <span
                      className={`font-medium cursor-pointer ${
                        parseFloat(entry.result) > parseFloat(entry.cost)
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                      onClick={() => {
                        setRecordingId(entry.id);
                        setResultValue(entry.result || "");
                      }}
                    >
                      {formatCurrency(entry.result)}
                    </span>
                  ) : entry.status === "playing" ? (
                    <button
                      onClick={() => {
                        setRecordingId(entry.id);
                        setResultValue("");
                      }}
                      className="text-red-400 text-xs animate-pulse"
                    >
                      Record →
                    </button>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </div>
                <div className="col-span-1 text-right">
                  {entry.multiplier ? (
                    <span className="text-yellow-400 text-xs">
                      {formatMultiplier(entry.multiplier)}
                    </span>
                  ) : entry.status === "playing" ? (
                    <span className="text-red-400 text-xs animate-pulse">
                      LIVE
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </div>
                <div className="col-span-1 flex items-center justify-end gap-1">
                  {entry.status === "pending" && hunt.status !== "completed" && (
                    <button
                      onClick={() => setPlaying(entry.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                      title="Set as playing"
                    >
                      <Play size={12} />
                    </button>
                  )}
                  {hunt.status !== "completed" && (
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
