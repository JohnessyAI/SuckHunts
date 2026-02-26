"use client";

import { useRef, useEffect, useState } from "react";
import { formatCurrency, formatMultiplier } from "@/lib/utils/format";
import { getWidgetType } from "@/lib/overlay/widget-registry";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function c(config: Record<string, unknown>, key: string, fallback: any = undefined): any {
  return config[key] ?? fallback;
}

interface HuntEntry {
  id: string;
  gameName: string;
  gameImage: string | null;
  gameProvider: string | null;
  betSize: string;
  cost: string;
  result: string | null;
  multiplier: string | null;
  status: string;
}

interface HuntData {
  title: string;
  status: string;
  totalCost: string;
  totalWon: string;
  entries: HuntEntry[];
}

export interface CurrentGameData {
  gameName: string;
  gameImage: string | null;
  gameProvider: string | null;
  betSize: string;
  info: {
    rtp: string | null;
    volatility: string | null;
    maxWin: string | null;
  } | null;
  personalRecord: {
    timesPlayed: number;
    biggestWin: number;
    biggestWinBet: number;
    biggestMultiplier: number;
    biggestMultiBet: number;
    avgMultiplier: number;
    atCurrentBet: {
      bestWin: number;
      bestMulti: number;
      timesPlayed: number;
      avgWin: number;
    } | null;
  } | null;
}

interface WidgetRendererProps {
  type: string;
  config: Record<string, unknown>;
  width: number;
  height: number;
  huntData?: HuntData | null;
  currentGameData?: CurrentGameData | null;
  isEditor?: boolean;
}

function getStyleWrapper(config: Record<string, unknown>): React.CSSProperties {
  const bgColor = c(config, "bgColor") as string | undefined;
  const bgOpacity = c(config, "bgOpacity", 0) as number;
  const borderRadius = c(config, "borderRadius", 0) as number;
  const borderColor = c(config, "borderColor") as string | undefined;
  const borderWidth = c(config, "borderWidth", 0) as number;
  const padding = c(config, "padding", 0) as number;

  const style: React.CSSProperties = {
    width: "100%",
    height: "100%",
    borderRadius,
    padding,
    overflow: "hidden",
    boxSizing: "border-box",
  };

  if (bgColor && bgOpacity > 0) {
    // Convert hex to rgba
    const hex = bgColor.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${bgOpacity})`;
  }

  if (borderColor && borderWidth > 0) {
    style.border = `${borderWidth}px solid ${borderColor}`;
  }

  return style;
}

export default function WidgetRenderer({
  type,
  config,
  width,
  height,
  huntData,
  currentGameData,
  isEditor,
}: WidgetRendererProps) {
  const def = getWidgetType(type);
  const refW = def?.defaultWidth ?? width;
  const refH = def?.defaultHeight ?? height;
  const needsScale = width !== refW || height !== refH;

  const styleWrapper = getStyleWrapper(config);

  const content = (
    <div style={styleWrapper}>
      <WidgetContent
        type={type}
        config={config}
        huntData={huntData}
        currentGameData={currentGameData}
        isEditor={isEditor}
      />
    </div>
  );

  if (!needsScale) return <div style={{ width, height }}>{content}</div>;

  return (
    <div style={{ width, height, overflow: "hidden" }}>
      <div
        style={{
          width: refW,
          height: refH,
          transform: `scale(${width / refW}, ${height / refH})`,
          transformOrigin: "top left",
        }}
      >
        {content}
      </div>
    </div>
  );
}

function HuntTableWidget({
  config,
  entries,
  isEditor,
}: {
  config: Record<string, unknown>;
  entries: HuntEntry[];
  isEditor?: boolean;
}) {
  const fontSize = c(config, "fontSize", 14) as number ?? 14;
  const autoScroll = c(config, "autoScroll", true) as boolean;
  const scrollSpeed = c(config, "scrollSpeed", 30) as number ?? 30;
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (!innerRef.current) return;
    const h = innerRef.current.scrollHeight / 2;
    setContentHeight(h);
  }, [entries, fontSize, config]);

  if (!entries.length) {
    return (
      <div className="flex items-center justify-center h-full text-white/30 text-sm italic">
        Hunt Table{isEditor ? " (connect a hunt)" : ""}
      </div>
    );
  }

  const renderRow = (e: HuntEntry, i: number, keyPrefix = "") => {
    const isWin = e.result && parseFloat(e.result) > parseFloat(e.cost);
    return (
      <div
        key={`${keyPrefix}${e.id}`}
        className={`flex items-center justify-between px-2 py-1 rounded ${
          e.status === "playing"
            ? "bg-red-500/20"
            : e.status === "completed"
            ? "bg-white/5"
            : "bg-white/[0.02] opacity-50"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-white/30 w-5 text-right">{i + 1}</span>
          <span className="truncate text-white">{e.gameName}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {c(config, "showCost") && (
            <span className="text-white/60">{formatCurrency(e.cost)}</span>
          )}
          {c(config, "showResult") && (
            <span className={e.result ? (isWin ? "text-green-400" : "text-red-400") : "text-white/20"}>
              {e.result ? formatCurrency(e.result) : "\u2014"}
            </span>
          )}
          {c(config, "showMultiplier") && (
            <span className={e.status === "playing" ? "text-red-400 animate-pulse" : e.multiplier ? "text-yellow-400" : "text-white/20"}>
              {e.status === "playing" ? "LIVE" : e.multiplier ? formatMultiplier(e.multiplier) : "\u2014"}
            </span>
          )}
        </div>
      </div>
    );
  };

  if (!autoScroll) {
    return (
      <div className="h-full overflow-hidden" style={{ fontSize }}>
        <div className="space-y-0.5">
          {entries.map((e, i) => renderRow(e, i))}
        </div>
      </div>
    );
  }

  const duration = contentHeight > 0 ? contentHeight / scrollSpeed : 20;

  return (
    <div ref={containerRef} className="h-full overflow-hidden" style={{ fontSize }}>
      <div
        ref={innerRef}
        className="hunt-table-scroll space-y-0.5"
        style={{
          animationDuration: `${duration}s`,
        }}
      >
        {entries.map((e, i) => renderRow(e, i, "a-"))}
        {entries.map((e, i) => renderRow(e, i, "b-"))}
      </div>
      <style>{`
        .hunt-table-scroll {
          animation: huntTableScroll ${duration}s linear infinite;
        }
        @keyframes huntTableScroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
      `}</style>
    </div>
  );
}

function CurrentGameWidget({
  config,
  playing,
  currentGameData,
  isEditor,
}: {
  config: Record<string, unknown>;
  playing: HuntEntry | undefined;
  currentGameData?: CurrentGameData | null;
  isEditor?: boolean;
}) {
  const fontSize = c(config, "fontSize", 14) as number ?? 20;
  const showInfo = c(config, "showInfo", true) as boolean;
  const showRecord = c(config, "showRecord", true) as boolean;

  if (!playing) {
    return (
      <div className="flex items-center justify-center h-full text-white/30 text-sm italic">
        Currently Playing{isEditor ? " (connect a hunt)" : ""}
      </div>
    );
  }

  const gameImage = currentGameData?.gameImage ?? playing.gameImage;
  const gameProvider = currentGameData?.gameProvider ?? playing.gameProvider;
  const info = currentGameData?.info;
  const record = currentGameData?.personalRecord;
  const betSize = currentGameData?.betSize ?? playing.betSize;
  const atBet = record?.atCurrentBet;

  return (
    <div className="flex h-full gap-0">
      {/* Left: Game Image */}
      {c(config, "showImage", true) && gameImage && (
        <div className="h-full flex-shrink-0 flex items-center p-2">
          <img
            src={gameImage}
            alt={playing.gameName}
            className="h-full w-auto object-cover flex-shrink-0"
            style={{ borderRadius: 8, maxWidth: 140 }}
          />
        </div>
      )}

      {/* Center: Game Name + Info */}
      <div className="flex-1 flex flex-col justify-center min-w-0 px-3 py-2">
        <p className="text-white/40 text-[9px] uppercase tracking-wider font-medium">Current Game</p>
        <p className="text-white font-bold truncate leading-tight" style={{ fontSize }}>
          {playing.gameName}
        </p>
        {c(config, "showProvider") && gameProvider && (
          <p className="text-white/40 text-xs">{gameProvider}</p>
        )}

        {showInfo && info && (
          <div className="flex gap-3 mt-2">
            {info.maxWin && (
              <div>
                <p className="text-white/30 text-[8px] uppercase">Potential</p>
                <p className="text-white text-xs font-semibold">{info.maxWin}</p>
              </div>
            )}
            {info.rtp && (
              <div>
                <p className="text-white/30 text-[8px] uppercase">RTP</p>
                <p className="text-white text-xs font-semibold">{info.rtp}%</p>
              </div>
            )}
            {info.volatility && (
              <div>
                <p className="text-white/30 text-[8px] uppercase">Volatility</p>
                <p className="text-white text-xs font-semibold">{info.volatility}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Personal Record */}
      {showRecord && record && (
        <div className="flex-shrink-0 flex flex-col justify-center px-3 py-2 border-l border-white/10 min-w-[140px]">
          <p className="text-yellow-400 text-[9px] uppercase tracking-wider font-medium mb-1">Personal Record</p>
          <div className="space-y-0.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/40 text-[10px]">WIN</span>
              <span className="text-white text-xs font-bold">
                {atBet ? formatCurrency(atBet.bestWin) : formatCurrency(record.biggestWin)}
                {atBet && <span className="text-white/30 text-[8px] ml-1">(${parseFloat(betSize).toFixed(0)})</span>}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/40 text-[10px]">X</span>
              <span className="text-yellow-400 text-xs font-bold">
                {atBet ? formatMultiplier(atBet.bestMulti) : formatMultiplier(record.biggestMultiplier)}
                {atBet && <span className="text-white/30 text-[8px] ml-1">(${parseFloat(betSize).toFixed(0)})</span>}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-white/40 text-[10px]">AVG-WIN</span>
              <span className="text-white/70 text-xs font-bold">
                {atBet ? formatCurrency(atBet.avgWin) : formatMultiplier(record.avgMultiplier)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bet badge (only if no record shown) */}
      {c(config, "showBet") && !showRecord && (
        <div className="flex-shrink-0 flex flex-col justify-center px-3">
          <p className="text-white/40 text-xs">BET</p>
          <p className="text-white font-bold">${parseFloat(playing.betSize).toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}

function WidgetContent({
  type,
  config,
  huntData,
  currentGameData,
  isEditor,
}: {
  type: string;
  config: Record<string, unknown>;
  huntData?: HuntData | null;
  currentGameData?: CurrentGameData | null;
  isEditor?: boolean;
}) {
  const entries = huntData?.entries ?? [];
  const playing = entries.find((e) => e.status === "playing")
    ?? entries.find((e) => e.result == null || e.result === "");
  const completed = entries.filter((e) => e.status === "completed");
  const totalCost = parseFloat(huntData?.totalCost ?? "0");
  const totalWon = parseFloat(huntData?.totalWon ?? "0");
  const profit = totalWon - totalCost;
  const avgMultiplier =
    completed.length > 0
      ? completed
          .filter((e) => e.multiplier)
          .reduce((s, e) => s + parseFloat(e.multiplier!), 0) / completed.length
      : 0;
  const bestEntry = [...completed]
    .filter((e) => e.multiplier)
    .sort((a, b) => parseFloat(b.multiplier!) - parseFloat(a.multiplier!))[0];

  const placeholder = (label: string) => (
    <div className="flex items-center justify-center h-full text-white/30 text-sm italic">
      {label}
      {isEditor ? " (connect a hunt)" : ""}
    </div>
  );

  switch (type) {
    case "hunt-table": {
      return <HuntTableWidget config={config} entries={entries} isEditor={isEditor} />;
    }

    case "current-game": {
      return (
        <CurrentGameWidget
          config={config}
          playing={playing}
          currentGameData={currentGameData}
          isEditor={isEditor}
        />
      );
    }

    case "biggest-win": {
      const fontSize = c(config, "fontSize", 14) as number ?? 28;
      if (!bestEntry) return placeholder("Biggest Win");
      return (
        <div className="flex items-center justify-center h-full px-4">
          <div className="text-center">
            <p className="text-yellow-400 font-bold" style={{ fontSize }}>
              {formatMultiplier(bestEntry.multiplier!)}
            </p>
            {c(config, "showGame") && (
              <p className="text-white/60 text-sm mt-1">{bestEntry.gameName}</p>
            )}
          </div>
        </div>
      );
    }

    case "running-totals": {
      const fontSize = c(config, "fontSize", 14) as number ?? 16;
      const isHorizontal = c(config, "layout") === "horizontal";
      return (
        <div
          className={`flex ${isHorizontal ? "flex-row" : "flex-col"} items-center justify-around h-full px-4`}
          style={{ fontSize }}
        >
          <div className="text-center">
            <p className="text-white/40 text-[10px] uppercase">Cost</p>
            <p className="text-white font-bold">{formatCurrency(totalCost)}</p>
          </div>
          <div className="text-center">
            <p className="text-white/40 text-[10px] uppercase">Won</p>
            <p className="text-green-400 font-bold">{formatCurrency(totalWon)}</p>
          </div>
          {c(config, "showProfit") && (
            <div className="text-center">
              <p className="text-white/40 text-[10px] uppercase">Profit</p>
              <p className={`font-bold ${profit >= 0 ? "text-green-400" : "text-red-400"}`}>
                {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
              </p>
            </div>
          )}
          {c(config, "showAvg") && (
            <div className="text-center">
              <p className="text-white/40 text-[10px] uppercase">Avg</p>
              <p className="text-yellow-400 font-bold">{formatMultiplier(avgMultiplier)}</p>
            </div>
          )}
        </div>
      );
    }

    case "progress-bar": {
      const total = entries.length;
      const done = completed.length;
      const pct = total > 0 ? (done / total) * 100 : 0;
      const barColor = c(config, "barColor", "#ef4444") as string ?? "#ef4444";
      return (
        <div className="flex flex-col justify-center h-full px-4">
          {c(config, "showLabel") && (
            <div className="flex justify-between text-xs text-white/50 mb-1">
              <span>Progress</span>
              {c(config, "showCount") && <span>{done}/{total}</span>}
            </div>
          )}
          <div className="h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: barColor }}
            />
          </div>
        </div>
      );
    }

    case "next-up": {
      const count = c(config, "count", 5) as number ?? 3;
      const pending = entries.filter((e) => e.status === "pending");
      if (!pending.length) return placeholder("Next Up");
      return (
        <div className="h-full px-3 py-2 space-y-1" style={{ fontSize: c(config, "fontSize", 14) as number ?? 14 }}>
          {pending.slice(0, count).map((e, i) => (
            <div key={e.id} className="flex items-center gap-2 text-white/70">
              <span className="text-white/30 w-4 text-right text-xs">{i + 1}</span>
              <span className="truncate">{e.gameName}</span>
              {c(config, "showBet") && (
                <span className="ml-auto text-white/40 flex-shrink-0">
                  ${parseFloat(e.betSize).toFixed(2)}
                </span>
              )}
            </div>
          ))}
        </div>
      );
    }

    case "recent-results": {
      const count = c(config, "count", 5) as number ?? 5;
      const recent = [...completed].reverse().slice(0, count);
      if (!recent.length) return placeholder("Recent Results");
      return (
        <div className="h-full px-3 py-2 space-y-1" style={{ fontSize: c(config, "fontSize", 14) as number ?? 14 }}>
          {recent.map((e) => {
            const isWin = parseFloat(e.result!) > parseFloat(e.cost);
            return (
              <div key={e.id} className="flex items-center justify-between">
                <span className="truncate text-white">{e.gameName}</span>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className={isWin ? "text-green-400" : "text-red-400"}>
                    {formatCurrency(e.result!)}
                  </span>
                  {c(config, "showMultiplier") && e.multiplier && (
                    <span className="text-yellow-400">{formatMultiplier(e.multiplier)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    case "leaderboard": {
      const count = c(config, "count", 5) as number ?? 5;
      const ranked = [...completed]
        .filter((e) => e.multiplier)
        .sort((a, b) => parseFloat(b.multiplier!) - parseFloat(a.multiplier!))
        .slice(0, count);
      if (!ranked.length) return placeholder("Top Wins");
      return (
        <div className="h-full px-3 py-2 space-y-1" style={{ fontSize: c(config, "fontSize", 14) as number ?? 14 }}>
          {ranked.map((e, i) => (
            <div key={e.id} className="flex items-center gap-2">
              <span className={`font-bold w-5 text-right ${i === 0 ? "text-yellow-400" : "text-white/40"}`}>
                #{i + 1}
              </span>
              <span className="truncate text-white">{e.gameName}</span>
              <span className="ml-auto text-yellow-400 font-bold flex-shrink-0">
                {formatMultiplier(e.multiplier!)}
              </span>
            </div>
          ))}
        </div>
      );
    }

    case "custom-text": {
      const text = c(config, "text", "Your text here") as string ?? "Your text here";
      const fontSize = c(config, "fontSize", 14) as number ?? 24;
      const color = c(config, "color", "#ffffff") as string ?? "#ffffff";
      const fontWeight = c(config, "fontWeight", "bold") as string ?? "bold";
      const align = c(config, "align", "center") as string ?? "center";
      return (
        <div className="flex items-center justify-center h-full px-4" style={{ textAlign: align as React.CSSProperties["textAlign"] }}>
          <p style={{ fontSize, color, fontWeight: fontWeight as React.CSSProperties["fontWeight"] }} className="w-full">
            {text}
          </p>
        </div>
      );
    }

    case "image": {
      const url = c(config, "url", "") as string;
      const fit = c(config, "fit", "contain") as string ?? "contain";
      if (!url) return placeholder("Image (set URL)");
      return (
        <img
          src={url}
          alt=""
          className="w-full h-full"
          style={{ objectFit: fit as React.CSSProperties["objectFit"] }}
        />
      );
    }

    case "timer": {
      const fontSize = c(config, "fontSize", 14) as number ?? 28;
      const color = c(config, "color", "#ffffff") as string ?? "#ffffff";
      return (
        <div className="flex items-center justify-center h-full">
          <p style={{ fontSize, color }} className="font-mono font-bold">
            00:00:00
          </p>
        </div>
      );
    }

    case "game-image": {
      if (!playing?.gameImage) return placeholder("Game Image");
      return (
        <div className="h-full flex flex-col items-center justify-center">
          <img
            src={playing.gameImage}
            alt={playing.gameName}
            className="max-w-full max-h-full"
            style={{ objectFit: (c(config, "fit", "contain") as string) as React.CSSProperties["objectFit"] }}
          />
          {c(config, "showName") && (
            <p className="text-white text-sm mt-1">{playing.gameName}</p>
          )}
        </div>
      );
    }

    default:
      return placeholder(`Unknown: ${type}`);
  }
}
