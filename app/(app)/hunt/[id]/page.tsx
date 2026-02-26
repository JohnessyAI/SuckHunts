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
  Settings,
  ChevronDown,
} from "lucide-react";
import {
  formatCurrency,
  formatMultiplier,
  currencySymbol,
  SUPPORTED_CURRENCIES,
} from "@/lib/utils/format";

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
  description: string | null;
  status: string;
  startBalance: string | null;
  totalCost: string;
  totalWon: string;
  currency: string;
  shareSlug: string;
  entries: HuntEntry[];
}

export default function HuntControlPanel() {
  const params = useParams();
  const router = useRouter();
  const huntId = params.id as string;

  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [loading, setLoading] = useState(true);

  // Settings panel
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTitle, setSettingsTitle] = useState("");
  const [settingsDesc, setSettingsDesc] = useState("");
  const [settingsBalance, setSettingsBalance] = useState("");
  const [settingsCurrency, setSettingsCurrency] = useState("USD");
  const [savingSettings, setSavingSettings] = useState(false);

  // Add entry form
  const [showAdd, setShowAdd] = useState(false);
  const [gameName, setGameName] = useState("");
  const [betSize, setBetSize] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
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
    const data = await res.json();
    setHunt(data);
    // Sync settings form with fetched data
    setSettingsTitle(data.title);
    setSettingsDesc(data.description || "");
    setSettingsBalance(data.startBalance ? String(parseFloat(data.startBalance)) : "");
    setSettingsCurrency(data.currency || "USD");
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
    if (!gameName.trim() || !betSize) return;
    setAdding(true);

    const bet = parseFloat(betSize);
    const cost = buyPrice ? parseFloat(buyPrice) : bet;

    await fetch(`/api/hunts/${huntId}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameName: gameName.trim(),
        gameSlug: selectedGame?.slug || null,
        gameImage: selectedGame?.imageUrl || null,
        gameProvider: selectedGame?.provider || null,
        betSize: bet,
        cost,
      }),
    });

    setGameName("");
    setBetSize("");
    setBuyPrice("");
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

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    await fetch(`/api/hunts/${huntId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: settingsTitle.trim(),
        description: settingsDesc.trim() || null,
        startBalance: settingsBalance ? parseFloat(settingsBalance) : null,
        currency: settingsCurrency,
      }),
    });
    setSavingSettings(false);
    setShowSettings(false);
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

  const cur = hunt.currency || "USD";
  const sym = currencySymbol(cur);
  const totalCost = parseFloat(hunt.totalCost);
  const totalWon = parseFloat(hunt.totalWon);
  const profit = totalWon - totalCost;
  const startBal = hunt.startBalance ? parseFloat(hunt.startBalance) : null;
  const currentBalance = startBal != null ? startBal - totalCost + totalWon : null;
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
            {hunt.description && (
              <span> &middot; {hunt.description}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 bg-white/5 border border-white/10 text-gray-400 px-4 py-2 rounded-lg text-sm hover:text-white hover:bg-white/10 transition-all ${
              showSettings ? "text-white bg-white/10" : ""
            }`}
          >
            <Settings size={14} />
            Settings
          </button>
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

      {/* Settings Panel */}
      {showSettings && (
        <form
          onSubmit={saveSettings}
          className="glass-card rounded-xl border border-white/5 p-5 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Settings size={16} className="text-gray-400" />
            <h2 className="font-outfit font-semibold">Hunt Settings</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Name */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={settingsTitle}
                onChange={(e) => setSettingsTitle(e.target.value)}
                placeholder="Hunt title"
                className="form-input"
                required
              />
              <p className="text-[10px] text-gray-600 mt-1">
                Visible to viewers.
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={settingsDesc}
                onChange={(e) => setSettingsDesc(e.target.value)}
                placeholder="Brief description"
                className="form-input"
              />
              <p className="text-[10px] text-gray-600 mt-1">
                Optional. Visible to viewers.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            {/* Start Balance */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                Start Balance
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={settingsBalance}
                  onChange={(e) => setSettingsBalance(e.target.value)}
                  placeholder="0"
                  className="form-input pr-8"
                  step="0.01"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  {sym}
                </span>
              </div>
              <p className="text-[10px] text-gray-600 mt-1">
                Starting casino balance.
              </p>
            </div>

            {/* Current Balance (computed, read-only) */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                Current Balance
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={currentBalance != null ? currentBalance.toFixed(2) : "—"}
                  className="form-input pr-8 text-gray-400 cursor-default"
                  readOnly
                  tabIndex={-1}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  {sym}
                </span>
              </div>
              <p className="text-[10px] text-gray-600 mt-1">
                Auto-calculated.
              </p>
            </div>

            {/* End Balance (computed, read-only) */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                End Balance
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={
                    hunt.status === "completed" && currentBalance != null
                      ? currentBalance.toFixed(2)
                      : "—"
                  }
                  className="form-input pr-8 text-gray-400 cursor-default"
                  readOnly
                  tabIndex={-1}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                  {sym}
                </span>
              </div>
              <p className="text-[10px] text-gray-600 mt-1">
                Set when hunt ends.
              </p>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                Currency
              </label>
              <div className="relative">
                <select
                  value={settingsCurrency}
                  onChange={(e) => setSettingsCurrency(e.target.value)}
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
              <p className="text-[10px] text-gray-600 mt-1">
                Currency for this hunt.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingSettings || !settingsTitle.trim()}
            className="bg-gradient-to-r from-green-600 to-green-500 disabled:from-gray-700 disabled:to-gray-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
          >
            {savingSettings ? "Saving..." : "Update Settings"}
          </button>
        </form>
      )}

      {/* Running Totals */}
      <div className={`grid gap-3 mb-6 ${startBal != null ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4"}`}>
        {startBal != null && (
          <div className="glass-card rounded-lg p-3 border border-white/5 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
              Balance
            </p>
            <p className={`font-outfit text-lg font-bold ${currentBalance != null && currentBalance >= startBal ? "text-green-400" : "text-red-400"}`}>
              {formatCurrency(currentBalance ?? 0, cur)}
            </p>
          </div>
        )}
        {[
          { label: "Total Cost", value: formatCurrency(totalCost, cur), color: "text-white" },
          { label: "Total Won", value: formatCurrency(totalWon, cur), color: "text-green-400" },
          {
            label: "Profit",
            value: `${profit >= 0 ? "+" : ""}${formatCurrency(profit, cur)}`,
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
          className="glass-card rounded-xl border border-white/5 p-4 mb-3 relative z-20"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Game Search */}
            <div className="relative flex-1 min-w-0" ref={dropdownRef}>
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
                <div className="absolute z-[100] top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
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

            {/* Bet Size */}
            <input
              type="number"
              value={betSize}
              onChange={(e) => setBetSize(e.target.value)}
              placeholder="Bet size"
              className="form-input w-full sm:w-28"
              step="0.01"
              required
            />

            {/* Buy Price (optional — for bonus buys) */}
            <input
              type="number"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              placeholder="Buy price"
              className="form-input w-full sm:w-28"
              step="0.01"
            />

            {/* Submit */}
            <button
              type="submit"
              disabled={adding || !gameName.trim() || !betSize}
              className="bg-gradient-to-r from-red-600 to-red-500 disabled:from-gray-700 disabled:to-gray-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
            >
              {adding ? "Adding..." : "Add"}
            </button>
          </div>
          <p className="text-[10px] text-gray-600 mt-2">
            Leave &quot;Buy price&quot; empty if you spun into the bonus — cost will equal bet size.
          </p>
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

        {hunt.entries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No games added yet. Click &quot;Add Game&quot; to get started.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="text-left text-[11px] text-gray-500 uppercase tracking-wider font-medium px-4 py-2.5 w-10">#</th>
                <th className="text-left text-[11px] text-gray-500 uppercase tracking-wider font-medium py-2.5">Game</th>
                <th className="text-right text-[11px] text-gray-500 uppercase tracking-wider font-medium px-4 py-2.5 w-24">Bet</th>
                <th className="text-right text-[11px] text-gray-500 uppercase tracking-wider font-medium px-4 py-2.5 w-28">Won</th>
                <th className="text-right text-[11px] text-gray-500 uppercase tracking-wider font-medium px-4 py-2.5 w-20">Multi</th>
                {hunt.status !== "completed" && (
                  <th className="w-16 px-4 py-2.5" />
                )}
              </tr>
            </thead>
            <tbody>
              {hunt.entries.map((entry, i) => {
                const cost = parseFloat(entry.cost);
                const result = entry.result !== null ? parseFloat(entry.result) : null;
                const multi = entry.multiplier ? parseFloat(entry.multiplier) : null;
                const isProfit = result !== null && result > cost;
                const isLoss = result !== null && result <= cost;

                return (
                  <tr
                    key={entry.id}
                    className={`border-b border-white/5 last:border-b-0 transition-colors ${
                      entry.status === "playing"
                        ? "bg-red-500/5 border-l-2 border-l-red-500"
                        : isProfit
                        ? "border-l-2 border-l-green-500/40"
                        : isLoss
                        ? "border-l-2 border-l-red-500/30"
                        : ""
                    }`}
                  >
                    {/* # */}
                    <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                      {i + 1}
                    </td>

                    {/* Game */}
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3 min-w-0">
                        {entry.gameImage && (
                          <img
                            src={entry.gameImage}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <span className="text-white font-medium text-sm block truncate">
                            {entry.gameName}
                          </span>
                          {entry.gameProvider && (
                            <span className="text-[10px] text-gray-600 block">
                              {entry.gameProvider}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Bet */}
                    <td className="px-4 py-3 text-right text-sm text-gray-400">
                      {formatCurrency(entry.betSize, cur)}
                    </td>

                    {/* Won */}
                    <td className="px-4 py-3 text-right text-sm">
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
                            className="w-24 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm text-right text-white focus:border-red-500/50 focus:outline-none"
                            step="0.01"
                            autoFocus
                            placeholder="0.00"
                          />
                          <button
                            type="submit"
                            className="text-green-400 hover:text-green-300 text-xs font-medium ml-1"
                          >
                            OK
                          </button>
                        </form>
                      ) : result !== null ? (
                        <span
                          className={`font-semibold cursor-pointer hover:opacity-80 ${
                            isProfit ? "text-green-400" : "text-red-400"
                          }`}
                          onClick={() => {
                            setRecordingId(entry.id);
                            setResultValue(entry.result || "");
                          }}
                        >
                          {formatCurrency(result, cur)}
                        </span>
                      ) : entry.status === "playing" ? (
                        <button
                          onClick={() => {
                            setRecordingId(entry.id);
                            setResultValue("");
                          }}
                          className="text-red-400 text-xs font-medium animate-pulse"
                        >
                          Record &rarr;
                        </button>
                      ) : (
                        <span className="text-gray-700">&mdash;</span>
                      )}
                    </td>

                    {/* Multi */}
                    <td className="px-4 py-3 text-right text-sm">
                      {multi !== null ? (
                        <span
                          className={`font-semibold ${
                            multi > 1 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {formatMultiplier(multi)}
                        </span>
                      ) : entry.status === "playing" ? (
                        <span className="text-red-400 text-xs font-medium animate-pulse">
                          LIVE
                        </span>
                      ) : (
                        <span className="text-gray-700">&mdash;</span>
                      )}
                    </td>

                    {/* Actions */}
                    {hunt.status !== "completed" && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {entry.status === "pending" && (
                            <button
                              onClick={() => setPlaying(entry.id)}
                              className="text-gray-600 hover:text-red-400 transition-colors"
                              title="Set as playing"
                            >
                              <Play size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="text-gray-700 hover:text-red-400 transition-colors"
                            title="Remove"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
