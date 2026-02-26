"use client";

import { useRef, useEffect, useState } from "react";
import { formatCurrency, formatMultiplier } from "@/lib/utils/format";

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

// Inner dimensions after style wrapper (padding + border eat into available space)
function getInnerDimensions(config: Record<string, unknown>, width: number, height: number) {
  const padding = (c(config, "padding", 0) as number) ?? 0;
  const borderWidth = (c(config, "borderWidth", 0) as number) ?? 0;
  const inset = (padding + borderWidth) * 2;
  return {
    innerW: Math.max(0, width - inset),
    innerH: Math.max(0, height - inset),
  };
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
  const styleWrapper = getStyleWrapper(config);
  const { innerW, innerH } = getInnerDimensions(config, width, height);

  return (
    <div style={{ width, height, overflow: "hidden" }}>
      <div style={styleWrapper}>
        <WidgetContent
          type={type}
          config={config}
          width={innerW}
          height={innerH}
          huntData={huntData}
          currentGameData={currentGameData}
          isEditor={isEditor}
        />
      </div>
    </div>
  );
}

// ─── Hunt Table ───

function HuntTableWidget({
  config,
  entries,
  width,
  height,
  isEditor,
}: {
  config: Record<string, unknown>;
  entries: HuntEntry[];
  width: number;
  height: number;
  isEditor?: boolean;
}) {
  // Scale font to widget — constrained by both width and height
  const fontSize = Math.max(10, Math.min(width * 0.035, height * 0.04, 20));
  const autoScroll = c(config, "autoScroll", true) as boolean;
  const scrollSpeed = c(config, "scrollSpeed", 30) as number ?? 30;
  const containerRef = useRef<HTMLDivElement>(null);
  const singleSetRef = useRef<HTMLDivElement>(null);
  const [singleSetHeight, setSingleSetHeight] = useState(0);
  const [containerH, setContainerH] = useState(0);
  const ROW_GAP = 2; // px between rows

  // Responsive: progressively hide columns as width shrinks
  const showCost = width >= 350 && c(config, "showCost");
  const showResult = c(config, "showResult");
  const showMultiplier = width >= 300 && c(config, "showMultiplier");

  useEffect(() => {
    if (!singleSetRef.current || !containerRef.current) return;
    setSingleSetHeight(singleSetRef.current.offsetHeight);
    setContainerH(containerRef.current.clientHeight);
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
          {showCost && (
            <span className="text-white/60">{formatCurrency(e.cost)}</span>
          )}
          {showResult && (
            <span className={e.result ? (isWin ? "text-green-400" : "text-red-400") : "text-white/20"}>
              {e.result ? formatCurrency(e.result) : "\u2014"}
            </span>
          )}
          {showMultiplier && (
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
        <div style={{ display: "flex", flexDirection: "column", gap: ROW_GAP }}>
          {entries.map((e, i) => renderRow(e, i))}
        </div>
      </div>
    );
  }

  // Render enough copies so content always fills viewport + one extra set for seamless loop
  const copies = singleSetHeight > 0
    ? Math.max(2, Math.ceil(containerH / singleSetHeight) + 1)
    : 2;

  // Scroll exactly one set's height + the gap between sets
  const scrollDistance = singleSetHeight + ROW_GAP;
  const duration = scrollDistance > 0 ? scrollDistance / scrollSpeed : 20;

  return (
    <div ref={containerRef} className="h-full overflow-hidden" style={{ fontSize }}>
      <div
        className="hunt-table-scroll-seamless"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: ROW_GAP,
          animationDuration: `${duration}s`,
        }}
      >
        {Array.from({ length: copies }, (_, ci) => (
          <div
            key={ci}
            ref={ci === 0 ? singleSetRef : undefined}
            style={{ display: "flex", flexDirection: "column", gap: ROW_GAP }}
          >
            {entries.map((e, i) => renderRow(e, i, `c${ci}-`))}
          </div>
        ))}
      </div>
      <style>{`
        .hunt-table-scroll-seamless {
          animation: huntScrollSeamless ${duration}s linear infinite;
        }
        @keyframes huntScrollSeamless {
          0% { transform: translateY(0); }
          100% { transform: translateY(-${scrollDistance}px); }
        }
      `}</style>
    </div>
  );
}

// ─── Currently Playing ───

function CurrentGameWidget({
  config,
  playing,
  currentGameData,
  width,
  height,
  isEditor,
}: {
  config: Record<string, unknown>;
  playing: HuntEntry | undefined;
  currentGameData?: CurrentGameData | null;
  width: number;
  height: number;
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
  const atBet = record?.atCurrentBet ?? null;

  // ─── Responsive breakpoints ───
  // Width tiers determine which sections are visible
  const canShowImage = width >= 200 && c(config, "showImage", true);
  const canShowInfo = width >= 400 && showInfo && info;
  const canShowRecord = width >= 500 && showRecord && record;
  const canShowProvider = width >= 300 && c(config, "showProvider");
  const canShowBet = width >= 250 && c(config, "showBet") && !canShowRecord;

  // Height tiers determine density
  const isCompactH = height < 100;
  const isTallH = height >= 200;

  // Scale font with height when very compact or tall
  const adaptedFontSize = isCompactH
    ? Math.min(fontSize, Math.max(12, height * 0.25))
    : isTallH
    ? Math.min(fontSize * 1.3, 48)
    : fontSize;

  // Tall layout: stack vertically
  if (isTallH && height > width * 0.8) {
    return (
      <div className="flex flex-col h-full">
        {/* Image on top */}
        {canShowImage && gameImage && (
          <div className="flex-shrink-0 flex justify-center p-2" style={{ maxHeight: "50%" }}>
            <img
              src={gameImage}
              alt={playing.gameName}
              className="rounded-lg"
              style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
            />
          </div>
        )}
        {/* Name + details below */}
        <div className="flex-1 flex flex-col justify-center items-center min-h-0 px-3 py-1 text-center">
          <p className="text-white/40 text-[9px] uppercase tracking-wider font-medium">Current Game</p>
          <p className="text-white font-bold truncate w-full leading-tight" style={{ fontSize: adaptedFontSize }}>
            {playing.gameName}
          </p>
          {canShowProvider && gameProvider && (
            <p className="text-white/40 text-xs">{gameProvider}</p>
          )}
          {canShowInfo && (
            <div className="flex gap-3 mt-1 justify-center">
              {info!.maxWin && (
                <div>
                  <p className="text-white/30 text-[8px] uppercase">Potential</p>
                  <p className="text-white text-xs font-semibold">{info!.maxWin}</p>
                </div>
              )}
              {info!.rtp && (
                <div>
                  <p className="text-white/30 text-[8px] uppercase">RTP</p>
                  <p className="text-white text-xs font-semibold">{info!.rtp}%</p>
                </div>
              )}
              {info!.volatility && (
                <div>
                  <p className="text-white/30 text-[8px] uppercase">Volatility</p>
                  <p className="text-white text-xs font-semibold">{info!.volatility}</p>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Record at bottom */}
        {canShowRecord && (
          <RecordSection atBet={atBet} record={record!} betSize={betSize} horizontal />
        )}
      </div>
    );
  }

  // ─── Default horizontal layout ───
  return (
    <div className="flex h-full gap-0">
      {/* Left: Game Image */}
      {canShowImage && gameImage && (
        <div className="h-full flex-shrink-0 flex items-center p-2" style={{ maxWidth: "40%" }}>
          <img
            src={gameImage}
            alt={playing.gameName}
            className="rounded-lg"
            style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
          />
        </div>
      )}

      {/* Center: Game Name + Info */}
      <div className="flex-1 flex flex-col justify-center min-w-0 px-3 py-1">
        {!isCompactH && (
          <p className="text-white/40 text-[9px] uppercase tracking-wider font-medium">Current Game</p>
        )}
        <p className="text-white font-bold truncate leading-tight" style={{ fontSize: adaptedFontSize }}>
          {playing.gameName}
        </p>
        {canShowProvider && gameProvider && !isCompactH && (
          <p className="text-white/40 text-xs">{gameProvider}</p>
        )}

        {canShowInfo && !isCompactH && (
          <div className="flex gap-3 mt-1">
            {info!.maxWin && (
              <div>
                <p className="text-white/30 text-[8px] uppercase">Potential</p>
                <p className="text-white text-xs font-semibold">{info!.maxWin}</p>
              </div>
            )}
            {info!.rtp && (
              <div>
                <p className="text-white/30 text-[8px] uppercase">RTP</p>
                <p className="text-white text-xs font-semibold">{info!.rtp}%</p>
              </div>
            )}
            {info!.volatility && (
              <div>
                <p className="text-white/30 text-[8px] uppercase">Volatility</p>
                <p className="text-white text-xs font-semibold">{info!.volatility}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Personal Record */}
      {canShowRecord && (
        <RecordSection atBet={atBet} record={record!} betSize={betSize} />
      )}

      {/* Bet badge (only if no record shown) */}
      {canShowBet && (
        <div className="flex-shrink-0 flex flex-col justify-center px-3">
          <p className="text-white/40 text-xs">BET</p>
          <p className="text-white font-bold">${parseFloat(playing.betSize).toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}

function RecordSection({
  atBet,
  record,
  betSize,
  horizontal,
}: {
  atBet: CurrentGameData["personalRecord"] extends null ? never : NonNullable<CurrentGameData["personalRecord"]>["atCurrentBet"];
  record: NonNullable<CurrentGameData["personalRecord"]>;
  betSize: string;
  horizontal?: boolean;
}) {
  if (horizontal) {
    return (
      <div className="flex-shrink-0 flex items-center justify-around px-3 py-2 border-t border-white/10">
        <div className="text-center">
          <p className="text-white/30 text-[8px] uppercase">Win</p>
          <p className="text-white text-xs font-bold">
            {atBet ? formatCurrency(atBet.bestWin) : formatCurrency(record.biggestWin)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-white/30 text-[8px] uppercase">X</p>
          <p className="text-yellow-400 text-xs font-bold">
            {atBet ? formatMultiplier(atBet.bestMulti) : formatMultiplier(record.biggestMultiplier)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-white/30 text-[8px] uppercase">Avg</p>
          <p className="text-white/70 text-xs font-bold">
            {atBet ? formatCurrency(atBet.avgWin) : formatMultiplier(record.avgMultiplier)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 flex flex-col justify-center px-3 py-2 border-l border-white/10 min-w-[130px]">
      <p className="text-yellow-400 text-[9px] uppercase tracking-wider font-medium mb-1">Personal Record</p>
      <div className="space-y-0.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/40 text-[10px]">WIN</span>
          <span className="text-white text-xs font-bold">
            {atBet ? formatCurrency(atBet.bestWin) : formatCurrency(record.biggestWin)}
            {atBet && <span className="text-white/30 text-[8px] ml-1">(${parseFloat(betSize).toFixed(0)})</span>}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/40 text-[10px]">X</span>
          <span className="text-yellow-400 text-xs font-bold">
            {atBet ? formatMultiplier(atBet.bestMulti) : formatMultiplier(record.biggestMultiplier)}
            {atBet && <span className="text-white/30 text-[8px] ml-1">(${parseFloat(betSize).toFixed(0)})</span>}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/40 text-[10px]">AVG</span>
          <span className="text-white/70 text-xs font-bold">
            {atBet ? formatCurrency(atBet.avgWin) : formatMultiplier(record.avgMultiplier)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Widget Content Router ───

function WidgetContent({
  type,
  config,
  width,
  height,
  huntData,
  currentGameData,
  isEditor,
}: {
  type: string;
  config: Record<string, unknown>;
  width: number;
  height: number;
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
      return <HuntTableWidget config={config} entries={entries} width={width} height={height} isEditor={isEditor} />;
    }

    case "current-game": {
      return (
        <CurrentGameWidget
          config={config}
          playing={playing}
          currentGameData={currentGameData}
          width={width}
          height={height}
          isEditor={isEditor}
        />
      );
    }

    case "biggest-win": {
      if (!bestEntry) return placeholder("Biggest Win");
      // Scale font to fill — constrained by both width and height
      const showGame = c(config, "showGame") as boolean;
      const mainSize = Math.max(14, Math.min(width * 0.14, height * (showGame ? 0.3 : 0.45)));
      const subSize = Math.max(10, mainSize * 0.45);
      return (
        <div className="flex items-center justify-center h-full w-full px-4">
          <div className="text-center w-full">
            <p className="text-yellow-400 font-bold leading-tight" style={{ fontSize: mainSize }}>
              {formatMultiplier(bestEntry.multiplier!)}
            </p>
            {c(config, "showGame") && (
              <p className="text-white/60 truncate mt-1" style={{ fontSize: subSize }}>
                {bestEntry.gameName}
              </p>
            )}
          </div>
        </div>
      );
    }

    case "running-totals": {
      // Auto-switch layout based on aspect ratio (default: auto)
      const configLayout = c(config, "layout", "auto");
      const isHorizontal = configLayout === "horizontal"
        ? true
        : configLayout === "vertical"
        ? false
        : width > height * 1.2; // auto: landscape → horizontal, portrait → vertical

      // Count visible stats to compute per-item space
      const showProfit = c(config, "showProfit") as boolean;
      const showAvg = c(config, "showAvg") as boolean;
      const statCount = 2 + (showProfit ? 1 : 0) + (showAvg ? 1 : 0);

      // Scale font to fill: divide by stat count, constrained by BOTH axes
      const perItemW = isHorizontal ? width / statCount : width;
      const perItemH = isHorizontal ? height : height / statCount;
      const valSize = Math.max(12, Math.min(perItemW * 0.18, perItemH * 0.35));
      const labelSize = Math.max(8, valSize * 0.5);

      return (
        <div
          className={`flex ${isHorizontal ? "flex-row" : "flex-col"} items-center justify-around h-full w-full px-4`}
        >
          <div className="text-center">
            <p className="text-white/40 uppercase font-medium" style={{ fontSize: labelSize }}>Cost</p>
            <p className="text-white font-bold" style={{ fontSize: valSize }}>{formatCurrency(totalCost)}</p>
          </div>
          <div className="text-center">
            <p className="text-white/40 uppercase font-medium" style={{ fontSize: labelSize }}>Won</p>
            <p className="text-green-400 font-bold" style={{ fontSize: valSize }}>{formatCurrency(totalWon)}</p>
          </div>
          {showProfit && (
            <div className="text-center">
              <p className="text-white/40 uppercase font-medium" style={{ fontSize: labelSize }}>Profit</p>
              <p className={`font-bold ${profit >= 0 ? "text-green-400" : "text-red-400"}`} style={{ fontSize: valSize }}>
                {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
              </p>
            </div>
          )}
          {showAvg && (
            <div className="text-center">
              <p className="text-white/40 uppercase font-medium" style={{ fontSize: labelSize }}>Avg</p>
              <p className="text-yellow-400 font-bold" style={{ fontSize: valSize }}>{formatMultiplier(avgMultiplier)}</p>
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
      const isVerticalBar = height > width * 2;
      const barThickness = Math.max(4, Math.min(Math.min(width, height) * 0.3, 24));
      const labelSize = Math.max(9, Math.min(width * 0.04, height * 0.06, 16));

      if (isVerticalBar) {
        return (
          <div className="flex flex-row items-center justify-center w-full h-full py-4 gap-2">
            {c(config, "showLabel") && width >= 60 && (
              <div className="flex flex-col items-center text-white/50" style={{ fontSize: labelSize }}>
                <span style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}>Progress</span>
                {c(config, "showCount") && <span className="mt-1">{done}/{total}</span>}
              </div>
            )}
            <div className="bg-white/10 rounded-full overflow-hidden relative" style={{ width: barThickness, height: "100%" }}>
              <div
                className="absolute bottom-0 w-full rounded-full transition-all duration-500"
                style={{ height: `${pct}%`, backgroundColor: barColor }}
              />
            </div>
          </div>
        );
      }

      return (
        <div className="flex flex-col justify-center h-full px-4">
          {c(config, "showLabel") && height >= 40 && (
            <div className="flex justify-between text-white/50 mb-1" style={{ fontSize: labelSize }}>
              <span>Progress</span>
              {c(config, "showCount") && <span>{done}/{total}</span>}
            </div>
          )}
          <div className="bg-white/10 rounded-full overflow-hidden" style={{ height: barThickness }}>
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
      // Scale font to fit height — each row needs ~2.2x fontSize of space
      const rowFontSize = Math.max(10, Math.min(width * 0.05, height / Math.min(count, pending.length) / 2.2));
      const maxVisible = Math.max(1, Math.floor(height / (rowFontSize * 2.2)));
      const visible = pending.slice(0, Math.min(count, maxVisible));
      return (
        <div className="h-full px-3 py-2 space-y-1" style={{ fontSize: rowFontSize }}>
          {visible.map((e, i) => (
            <div key={e.id} className="flex items-center gap-2 text-white/70">
              <span className="text-white/30 text-right" style={{ width: rowFontSize * 1.2, fontSize: rowFontSize * 0.8 }}>{i + 1}</span>
              <span className="truncate">{e.gameName}</span>
              {c(config, "showBet") && width >= 200 && (
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
      const rowFontSize = Math.max(10, Math.min(width * 0.05, height / Math.min(count, recent.length) / 2.2));
      const maxVisible = Math.max(1, Math.floor(height / (rowFontSize * 2.2)));
      const visible = recent.slice(0, maxVisible);
      return (
        <div className="h-full px-3 py-2 space-y-1" style={{ fontSize: rowFontSize }}>
          {visible.map((e) => {
            const isWin = parseFloat(e.result!) > parseFloat(e.cost);
            return (
              <div key={e.id} className="flex items-center justify-between">
                <span className="truncate text-white">{e.gameName}</span>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className={isWin ? "text-green-400" : "text-red-400"}>
                    {formatCurrency(e.result!)}
                  </span>
                  {c(config, "showMultiplier") && e.multiplier && width >= 300 && (
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
      const rowFontSize = Math.max(10, Math.min(width * 0.05, height / Math.min(count, ranked.length) / 2.2));
      const maxVisible = Math.max(1, Math.floor(height / (rowFontSize * 2.2)));
      const visible = ranked.slice(0, maxVisible);
      return (
        <div className="h-full px-3 py-2 space-y-1" style={{ fontSize: rowFontSize }}>
          {visible.map((e, i) => (
            <div key={e.id} className="flex items-center gap-2">
              <span className={`font-bold text-right ${i === 0 ? "text-yellow-400" : "text-white/40"}`} style={{ width: rowFontSize * 1.5 }}>
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
      const color = c(config, "color", "#ffffff") as string ?? "#ffffff";
      const fontWeight = c(config, "fontWeight", "bold") as string ?? "bold";
      const align = c(config, "align", "center") as string ?? "center";
      // Scale text to fill: constrained by width (chars) and height
      const adaptedFontSize = Math.max(10, Math.min(width * 0.08, height * 0.4));
      return (
        <div className="flex items-center justify-center h-full px-4" style={{ textAlign: align as React.CSSProperties["textAlign"] }}>
          <p style={{ fontSize: adaptedFontSize, color, fontWeight: fontWeight as React.CSSProperties["fontWeight"] }} className="w-full leading-tight">
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
      const color = c(config, "color", "#ffffff") as string ?? "#ffffff";
      // "00:00:00" is ~8 chars wide — scale to fill
      const adaptedSize = Math.max(12, Math.min(width * 0.12, height * 0.45));
      return (
        <div className="flex items-center justify-center h-full">
          <p style={{ fontSize: adaptedSize, color }} className="font-mono font-bold">
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
          {c(config, "showName") && height >= 80 && (
            <p className="text-white text-sm mt-1">{playing.gameName}</p>
          )}
        </div>
      );
    }

    default:
      return placeholder(`Unknown: ${type}`);
  }
}
