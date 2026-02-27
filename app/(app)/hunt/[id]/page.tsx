"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Reorder } from "framer-motion";
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
  Trophy,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Send,
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
  totalBet: string;
  totalWon: string;
  currency: string;
  discordWebhook: string | null;
  shareSlug: string;
  entries: HuntEntry[];
}

type SortField = "position" | "bet" | "won" | "multi";
type SortDirection = "asc" | "desc";

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
  const [settingsWebhook, setSettingsWebhook] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Add entry form
  const [showAdd, setShowAdd] = useState(false);
  const [gameName, setGameName] = useState("");
  const [betSize, setBetSize] = useState("");
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
  const resultInputRef = useRef<HTMLInputElement>(null);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("position");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Discord
  const [discordSending, setDiscordSending] = useState(false);
  const [discordSent, setDiscordSent] = useState(false);

  const fetchHunt = useCallback(async () => {
    const res = await fetch(`/api/hunts/${huntId}`);
    if (!res.ok) {
      router.push("/dashboard");
      return;
    }
    const data = await res.json();
    setHunt(data);
    setSettingsTitle(data.title);
    setSettingsDesc(data.description || "");
    setSettingsBalance(data.startBalance ? String(parseFloat(data.startBalance)) : "");
    setSettingsCurrency(data.currency || "USD");
    setSettingsWebhook(data.discordWebhook || "");
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

  // Focus result input when recordingId changes (auto-advance)
  useEffect(() => {
    if (recordingId && resultInputRef.current) {
      resultInputRef.current.focus();
    }
  }, [recordingId]);

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

    await fetch(`/api/hunts/${huntId}/entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameName: gameName.trim(),
        gameSlug: selectedGame?.slug || null,
        gameImage: selectedGame?.imageUrl || null,
        gameProvider: selectedGame?.provider || null,
        betSize: bet,
        cost: bet,
      }),
    });

    setGameName("");
    setBetSize("");
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
    const currentIndex = hunt?.entries.findIndex((e) => e.id === entryId) ?? -1;
    const nextEntry = hunt?.entries.slice(currentIndex + 1).find((e) => e.status !== "completed");
    setResultValue("");
    if (nextEntry) {
      setRecordingId(nextEntry.id);
    } else {
      setRecordingId(null);
    }
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
    // Auto-focus first pending entry when starting the hunt
    if (status === "live" && hunt) {
      const firstPending = hunt.entries.find((e) => e.status !== "completed");
      if (firstPending) {
        setRecordingId(firstPending.id);
        setResultValue("");
      }
    }
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
        discordWebhook: settingsWebhook.trim() || null,
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

  // Sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "desc") {
        setSortDirection("asc");
      } else {
        setSortField("position");
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedEntries = useMemo(() => {
    if (!hunt) return [];
    const entries = [...hunt.entries];
    if (sortField === "position") {
      return sortDirection === "asc"
        ? entries.sort((a, b) => a.position - b.position)
        : entries.sort((a, b) => b.position - a.position);
    }
    const getValue = (e: HuntEntry): number => {
      switch (sortField) {
        case "bet": return parseFloat(e.betSize);
        case "won": return e.result ? parseFloat(e.result) : -Infinity;
        case "multi": return e.multiplier ? parseFloat(e.multiplier) : -Infinity;
        default: return e.position;
      }
    };
    return entries.sort((a, b) =>
      sortDirection === "asc" ? getValue(a) - getValue(b) : getValue(b) - getValue(a)
    );
  }, [hunt, sortField, sortDirection]);

  // Drag-and-drop reorder
  const handleReorder = (newOrder: HuntEntry[]) => {
    setHunt((prev) =>
      prev ? { ...prev, entries: newOrder.map((e, i) => ({ ...e, position: i })) } : prev
    );
    fetch(`/api/hunts/${huntId}/entries/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: newOrder.map((e) => e.id) }),
    });
  };

  // Discord webhook
  const sendToDiscord = async () => {
    if (!hunt || !hunt.discordWebhook || discordSending) return;
    setDiscordSending(true);

    const top5 = [...hunt.entries]
      .filter((e) => e.result)
      .sort((a, b) => parseFloat(b.result!) - parseFloat(a.result!))
      .slice(0, 5);

    const cur = hunt.currency || "USD";
    const completedEntries = hunt.entries.filter((e) => e.status === "completed");
    const totalBet = completedEntries.reduce((s, e) => s + parseFloat(e.betSize), 0);
    const totalWon = completedEntries.reduce((s, e) => s + (e.result ? parseFloat(e.result) : 0), 0);
    const profit = totalWon - totalBet;

    const topWinsText = top5.length > 0
      ? top5.map((e, i) => `${i + 1}. ${e.gameName} — ${formatCurrency(e.result!, cur)} (${e.multiplier ? formatMultiplier(e.multiplier) : "—"})`).join("\n")
      : "No results yet";

    const viewerUrl = `${window.location.origin}/hunt/${hunt.id}/live`;

    try {
      await fetch(hunt.discordWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [{
            title: `🎰 ${hunt.title}`,
            url: viewerUrl,
            color: profit >= 0 ? 5763719 : 15548997,
            fields: [
              { name: "💰 Total Bet", value: formatCurrency(totalBet, cur), inline: true },
              { name: "🎉 Total Won", value: formatCurrency(totalWon, cur), inline: true },
              { name: profit >= 0 ? "📈 Profit" : "📉 Loss", value: `${profit >= 0 ? "+" : ""}${formatCurrency(profit, cur)}`, inline: true },
              { name: "🏆 Top Wins", value: topWinsText },
            ],
            footer: { text: "BonusHunt Tracker by Sucks Media" },
          }],
        }),
      });
      setDiscordSent(true);
      setTimeout(() => setDiscordSent(false), 3000);
    } catch {
      // Silently fail — webhook URL may be invalid
    }
    setDiscordSending(false);
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
  const startBal = hunt.startBalance ? parseFloat(hunt.startBalance) : null;
  const completedEntries = hunt.entries.filter((e) => e.status === "completed");
  const completed = completedEntries.length;
  const allBetTotal = hunt.entries.reduce((s, e) => s + parseFloat(e.betSize), 0);
  const totalWon = completedEntries.reduce((s, e) => s + (e.result ? parseFloat(e.result) : 0), 0);
  // Profit = total won - start balance (what we spent buying bonuses)
  const profit = startBal != null ? totalWon - startBal : totalWon - allBetTotal;
  const avgMultiplier =
    completed > 0
      ? completedEntries
          .filter((e) => e.multiplier)
          .reduce((s, e) => s + parseFloat(e.multiplier!), 0) / completed
      : 0;
  // Required avg multiplier on remaining games to break even
  const remainingEntries = hunt.entries.filter((e) => e.status !== "completed");
  const remainingBetTotal = remainingEntries.reduce((s, e) => s + parseFloat(e.betSize), 0);
  const amountStillNeeded = startBal != null ? startBal - totalWon : allBetTotal - totalWon;
  const reqAvgMulti = remainingBetTotal > 0 && amountStillNeeded > 0
    ? amountStillNeeded / remainingBetTotal
    : 0;
  const biggestWin = completedEntries.length > 0
    ? completedEntries.reduce((best, e) => {
        const r = e.result ? parseFloat(e.result) : 0;
        return r > best.amount
          ? { amount: r, name: e.gameName, image: e.gameImage, bet: parseFloat(e.betSize), multi: e.multiplier ? parseFloat(e.multiplier) : null }
          : best;
      }, { amount: 0, name: "", image: null as string | null, bet: 0, multi: null as number | null })
    : null;
  const bestMulti = completedEntries.length > 0
    ? completedEntries.reduce((best, e) => {
        const m = e.multiplier ? parseFloat(e.multiplier) : 0;
        return m > best.value ? { value: m, name: e.gameName } : best;
      }, { value: 0, name: "" })
    : null;
  const wins = completedEntries.filter((e) => e.result && parseFloat(e.result) > parseFloat(e.betSize)).length;
  const losses = completed - wins;
  const isDraggable = sortField === "position" && sortDirection === "asc";
  const showActions = hunt.status !== "completed";
  const gridCols = showActions
    ? "grid-cols-[40px_1fr_96px_112px_80px_64px]"
    : "grid-cols-[40px_1fr_96px_112px_80px]";

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
              Start Hunt
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
          {hunt.status === "completed" && (
            <button
              onClick={() => updateHuntStatus("live")}
              className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:scale-105 transition-all shadow-lg shadow-red-500/25"
            >
              <Play size={14} />
              Reopen Hunt
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
          {hunt.discordWebhook && (
            <button
              onClick={sendToDiscord}
              disabled={discordSending}
              className={`flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-lg text-sm transition-all ${
                discordSent
                  ? "text-green-400 border-green-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
              title="Send results to Discord"
            >
              <Send size={14} />
              {discordSending ? "Sending..." : discordSent ? "Sent!" : "Discord"}
            </button>
          )}
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
              <p className="text-[10px] text-gray-600 mt-1">Visible to viewers.</p>
            </div>
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
              <p className="text-[10px] text-gray-600 mt-1">Optional. Visible to viewers.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
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
              <p className="text-[10px] text-gray-600 mt-1">Starting casino balance.</p>
            </div>
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
              <p className="text-[10px] text-gray-600 mt-1">Currency for this hunt.</p>
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
              Discord Webhook
            </label>
            <input
              type="url"
              value={settingsWebhook}
              onChange={(e) => setSettingsWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="form-input"
            />
            <p className="text-[10px] text-gray-600 mt-1">
              Paste a Discord webhook URL to send results to your server.
            </p>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {startBal != null && (
          <div className="glass-card rounded-lg p-3 border border-white/5 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Start Balance</p>
            <p className="font-outfit text-lg font-bold text-white">
              {formatCurrency(startBal, cur)}
            </p>
          </div>
        )}
        <div className="glass-card rounded-lg p-3 border border-white/5 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total Won</p>
          <p className="font-outfit text-lg font-bold text-green-400">
            {formatCurrency(totalWon, cur)}
          </p>
        </div>
        <div className="glass-card rounded-lg p-3 border border-white/5 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Profit</p>
          <p className={`font-outfit text-lg font-bold ${profit >= 0 ? "text-green-400" : "text-red-400"}`}>
            {profit >= 0 ? "+" : ""}{formatCurrency(profit, cur)}
          </p>
        </div>
        <div className="glass-card rounded-lg p-3 border border-white/5 text-center">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Avg Req Multi</p>
          <p className={`font-outfit text-lg font-bold ${reqAvgMulti > 0 ? "text-orange-400" : "text-green-400"}`}>
            {formatMultiplier(reqAvgMulti)}
          </p>
        </div>
      </div>

      {/* Add Game Form */}
      {showAdd && (
        <form
          onSubmit={addEntry}
          className="glass-card rounded-xl border border-white/5 p-4 mb-3 relative z-20"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0" ref={dropdownRef}>
              {selectedGame ? (
                <div className="form-input flex items-center gap-2">
                  {selectedGame.imageUrl && (
                    <img src={selectedGame.imageUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
                  )}
                  <span className="truncate text-white text-sm flex-1">{selectedGame.name}</span>
                  <span className="text-[10px] text-gray-500 flex-shrink-0">{selectedGame.provider}</span>
                  <button type="button" onClick={clearSelectedGame} className="text-gray-500 hover:text-white flex-shrink-0">
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
                        <img src={game.imageUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-white/5 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white truncate">{game.name}</p>
                        <p className="text-[10px] text-gray-500">{game.provider}</p>
                      </div>
                      {game.rtp && (
                        <span className="text-[10px] text-gray-500 flex-shrink-0">{game.rtp}% RTP</span>
                      )}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => { setShowResults(false); setSearchResults([]); }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors text-left border-t border-white/5"
                  >
                    <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center flex-shrink-0">
                      <Plus size={14} className="text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-400">Use &quot;{gameName}&quot; as custom name</p>
                  </button>
                </div>
              )}
            </div>

            <input
              type="number"
              value={betSize}
              onChange={(e) => setBetSize(e.target.value)}
              placeholder="Bet size"
              className="form-input w-full sm:w-28"
              step="0.01"
              required
            />
            <button
              type="submit"
              disabled={adding || !gameName.trim() || !betSize}
              className="bg-gradient-to-r from-red-600 to-red-500 disabled:from-gray-700 disabled:to-gray-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
            >
              {adding ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      )}

      {/* Entries Table */}
      <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="font-outfit font-semibold">Games</h2>
          {hunt.status !== "completed" && (
            <button
              onClick={() => setShowAdd(!showAdd)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                showAdd
                  ? "bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
                  : "bg-gradient-to-r from-red-600 to-red-500 text-white hover:scale-105 shadow-lg shadow-red-500/25"
              }`}
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
          <>
            {/* Header Row */}
            <div className={`grid ${gridCols} bg-white/[0.02] border-b border-white/5 items-center`}>
              <div
                className="text-left text-[11px] text-gray-500 uppercase tracking-wider font-medium px-4 py-2.5 cursor-pointer hover:text-gray-300 transition-colors"
                onClick={() => { setSortField("position"); setSortDirection("asc"); }}
                title="Reset to default order"
              >
                #
              </div>
              <div className="text-left text-[11px] text-gray-500 uppercase tracking-wider font-medium py-2.5">
                Game
              </div>
              <SortHeader label="Bet" field="bet" current={sortField} direction={sortDirection} onSort={handleSort} className="text-right px-4 py-2.5" />
              <SortHeader label="Won" field="won" current={sortField} direction={sortDirection} onSort={handleSort} className="text-right px-4 py-2.5" />
              <SortHeader label="Multi" field="multi" current={sortField} direction={sortDirection} onSort={handleSort} className="text-right px-4 py-2.5" />
              {showActions && <div className="px-4 py-2.5" />}
            </div>

            {/* Best Win Row */}
            {biggestWin && biggestWin.amount > 0 && (
              <div className={`grid ${gridCols} bg-yellow-500/[0.04] border-b border-yellow-500/10 items-center`}>
                <div className="px-4 py-2.5 text-yellow-500">
                  <Trophy size={14} />
                </div>
                <div className="py-2.5 pr-4">
                  <div className="flex items-center gap-2 min-w-0">
                    {biggestWin.image && (
                      <img src={biggestWin.image} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0" />
                    )}
                    <span className="text-yellow-400 font-medium text-xs truncate">
                      Best Win — {biggestWin.name}
                    </span>
                  </div>
                </div>
                <div className="px-4 py-2.5 text-right text-xs text-yellow-400/60">
                  {formatCurrency(biggestWin.bet, cur)}
                </div>
                <div className="px-4 py-2.5 text-right text-xs text-yellow-400 font-semibold">
                  {formatCurrency(biggestWin.amount, cur)}
                </div>
                <div className="px-4 py-2.5 text-right text-xs text-yellow-400 font-semibold">
                  {biggestWin.multi ? formatMultiplier(biggestWin.multi) : "—"}
                </div>
                {showActions && <div />}
              </div>
            )}

            {/* Entry Rows */}
            {isDraggable ? (
              <Reorder.Group axis="y" values={sortedEntries} onReorder={handleReorder} as="div">
                {sortedEntries.map((entry, i) => (
                  <Reorder.Item
                    key={entry.id}
                    value={entry}
                    as="div"
                    whileDrag={{ scale: 1.01, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 50 }}
                  >
                    <EntryRow
                      entry={entry}
                      index={i}
                      cur={cur}
                      gridCols={gridCols}
                      showActions={showActions}
                      recordingId={recordingId}
                      resultValue={resultValue}
                      resultInputRef={resultInputRef}
                      setRecordingId={setRecordingId}
                      setResultValue={setResultValue}
                      recordResult={recordResult}
                      deleteEntry={deleteEntry}
                      huntStatus={hunt.status}
                      draggable
                    />
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            ) : (
              <div>
                {sortedEntries.map((entry, i) => (
                  <EntryRow
                    key={entry.id}
                    entry={entry}
                    index={i}
                    cur={cur}
                    gridCols={gridCols}
                    showActions={showActions}
                    recordingId={recordingId}
                    resultValue={resultValue}
                    resultInputRef={resultInputRef}
                    setRecordingId={setRecordingId}
                    setResultValue={setResultValue}
                    recordResult={recordResult}
                    deleteEntry={deleteEntry}
                    huntStatus={hunt.status}
                    draggable={false}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Game Stats */}
        {completed > 0 && (
          <div className="border-t border-white/5 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500">
            <span>
              <span className="text-gray-400 font-medium">{completed}</span> played
            </span>
            <span>
              <span className="text-green-400 font-medium">{wins}W</span>
              {" / "}
              <span className="text-red-400 font-medium">{losses}L</span>
            </span>
            {biggestWin && biggestWin.amount > 0 && (
              <span className="flex items-center gap-1">
                <Trophy size={12} className="text-yellow-400" />
                Biggest win{" "}
                <span className="text-green-400 font-medium">{formatCurrency(biggestWin.amount, cur)}</span>
                <span className="text-gray-600">({biggestWin.name})</span>
              </span>
            )}
            {bestMulti && bestMulti.value > 0 && (
              <span>
                Best multi{" "}
                <span className="text-yellow-400 font-medium">{formatMultiplier(bestMulti.value)}</span>
                <span className="text-gray-600"> ({bestMulti.name})</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Sort Header ─── */

function SortHeader({
  label,
  field,
  current,
  direction,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  current: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = current === field;
  return (
    <div
      className={`text-[11px] text-gray-500 uppercase tracking-wider font-medium cursor-pointer select-none hover:text-gray-300 transition-colors group ${className || ""}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          direction === "desc" ? (
            <ArrowDown size={10} className="text-red-400" />
          ) : (
            <ArrowUp size={10} className="text-red-400" />
          )
        ) : (
          <ArrowDown size={10} className="text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </span>
    </div>
  );
}

/* ─── Entry Row ─── */

function EntryRow({
  entry,
  index,
  cur,
  gridCols,
  showActions,
  recordingId,
  resultValue,
  resultInputRef,
  setRecordingId,
  setResultValue,
  recordResult,
  deleteEntry,
  huntStatus,
  draggable,
}: {
  entry: HuntEntry;
  index: number;
  cur: string;
  gridCols: string;
  showActions: boolean;
  recordingId: string | null;
  resultValue: string;
  resultInputRef: React.RefObject<HTMLInputElement | null>;
  setRecordingId: (id: string | null) => void;
  setResultValue: (v: string) => void;
  recordResult: (id: string) => void;
  deleteEntry: (id: string) => void;
  huntStatus: string;
  draggable: boolean;
}) {
  const cost = parseFloat(entry.cost);
  const result = entry.result !== null ? parseFloat(entry.result) : null;
  const multi = entry.multiplier ? parseFloat(entry.multiplier) : null;
  const isProfit = result !== null && result > cost;
  const isLoss = result !== null && result <= cost;

  return (
    <div
      className={`grid ${gridCols} items-center border-b border-white/5 last:border-b-0 transition-colors ${
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
      <div className="px-4 py-3 text-gray-600 text-xs font-mono flex items-center gap-1">
        {draggable && (
          <GripVertical size={12} className="text-gray-700 cursor-grab flex-shrink-0" />
        )}
        {index + 1}
      </div>

      {/* Game */}
      <div className="py-3 pr-4">
        <div
          className="flex items-center gap-3 min-w-0 cursor-pointer group"
          onClick={() => {
            navigator.clipboard.writeText(entry.gameName);
          }}
          title="Click to copy game name"
        >
          {entry.gameImage && (
            <img src={entry.gameImage} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 group-hover:ring-2 group-hover:ring-red-500/50 transition-all" />
          )}
          <div className="min-w-0">
            <span className="text-white font-medium text-sm block truncate group-hover:text-red-400 transition-colors">{entry.gameName}</span>
            {entry.gameProvider && (
              <span className="text-[10px] text-gray-600 block">{entry.gameProvider}</span>
            )}
          </div>
        </div>
      </div>

      {/* Bet */}
      <div className="px-4 py-3 text-right text-sm text-gray-400">
        {formatCurrency(entry.betSize, cur)}
      </div>

      {/* Won */}
      <div className="px-4 py-3 text-right text-sm">
        {recordingId === entry.id ? (
          <form
            onSubmit={(e) => { e.preventDefault(); recordResult(entry.id); }}
            className="flex items-center gap-1 justify-end"
          >
            <input
              ref={resultInputRef}
              type="number"
              value={resultValue}
              onChange={(e) => setResultValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setRecordingId(null);
                  setResultValue("");
                }
              }}
              className="w-24 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-sm text-right text-white focus:border-red-500/50 focus:outline-none"
              step="0.01"
              autoFocus
              placeholder="0.00"
            />
            <button type="submit" className="text-green-400 hover:text-green-300 text-xs font-medium ml-1">
              OK
            </button>
          </form>
        ) : result !== null ? (
          <span
            className={`font-semibold cursor-pointer hover:opacity-80 ${isProfit ? "text-green-400" : "text-red-400"}`}
            onClick={() => { setRecordingId(entry.id); setResultValue(entry.result || ""); }}
          >
            {formatCurrency(result, cur)}
          </span>
        ) : huntStatus !== "completed" ? (
          <div
            className="inline-flex items-center justify-end w-24 bg-white/[0.03] border border-white/10 rounded-md px-2 py-1 text-sm text-gray-600 cursor-pointer hover:border-white/20 hover:text-gray-400 transition-all"
            onClick={() => { setRecordingId(entry.id); setResultValue(""); }}
          >
            0.00
          </div>
        ) : (
          <span className="text-gray-700">&mdash;</span>
        )}
      </div>

      {/* Multi */}
      <div className="px-4 py-3 text-right text-sm">
        {multi !== null ? (
          <span className={`font-semibold ${multi > 1 ? "text-green-400" : "text-red-400"}`}>
            {formatMultiplier(multi)}
          </span>
        ) : entry.status === "playing" ? (
          <span className="text-red-400 text-xs font-medium animate-pulse">LIVE</span>
        ) : (
          <span className="text-gray-700">&mdash;</span>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="px-4 py-3 text-right">
          <button
            onClick={() => deleteEntry(entry.id)}
            className="text-gray-700 hover:text-red-400 transition-colors"
            title="Remove"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
