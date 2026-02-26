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

// Shorthand: the smaller dimension drives proportional scaling
function minDim(w: number, h: number) {
  return Math.min(w, h);
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
  // Scale font proportionally — config fontSize acts as weight, clamped by widget size
  const configFontSize = c(config, "fontSize", 14) as number ?? 14;
  const fontScale = configFontSize / 14;
  const fontSize = Math.max(10, Math.min(width * 0.035 * fontScale, height * 0.04 * fontScale, configFontSize * 1.5));
  const autoScroll = c(config, "autoScroll", true) as boolean;
  const scrollSpeed = c(config, "scrollSpeed", 30) as number ?? 30;
  const containerRef = useRef<HTMLDivElement>(null);
  const singleSetRef = useRef<HTMLDivElement>(null);
  const [singleSetHeight, setSingleSetHeight] = useState(0);
  const [containerH, setContainerH] = useState(0);
  const ROW_GAP = 2;

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
        className={`flex items-center justify-between px-2 py-1 rounded overflow-hidden ${
          e.status === "playing"
            ? "bg-red-500/20"
            : e.status === "completed"
            ? "bg-white/5"
            : "bg-white/[0.02] opacity-50"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-white/30 flex-shrink-0" style={{ width: fontSize * 1.5, textAlign: "right" }}>{i + 1}</span>
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
      <div className="h-full w-full overflow-hidden" style={{ fontSize }}>
        <div style={{ display: "flex", flexDirection: "column", gap: ROW_GAP }}>
          {entries.map((e, i) => renderRow(e, i))}
        </div>
      </div>
    );
  }

  const copies = singleSetHeight > 0
    ? Math.max(2, Math.ceil(containerH / singleSetHeight) + 1)
    : 2;

  const scrollDistance = singleSetHeight + ROW_GAP;
  const duration = scrollDistance > 0 ? scrollDistance / scrollSpeed : 20;

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden" style={{ fontSize }}>
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
  if (!playing) {
    return (
      <div className="flex items-center justify-center h-full w-full text-white/30 text-sm italic">
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

  // ─── Proportional scaling ───
  const configFontSize = c(config, "fontSize", 20) as number ?? 20;
  const md = minDim(width, height);
  const isPortrait = height > width * 0.8;
  const isLandscape = width > height * 1.2;

  // Config fontSize acts as a weight (20 = 1.0x, 40 = 2.0x, 10 = 0.5x)
  const fontScale = configFontSize / 20;
  const titleSize = Math.max(11, Math.min(md * 0.14 * fontScale, width * 0.08 * fontScale, configFontSize * 2));
  const labelSize = Math.max(7, titleSize * 0.45);
  const detailSize = Math.max(8, titleSize * 0.55);

  // Responsive visibility — based on available space
  const canShowImage = md >= 80 && c(config, "showImage", true);
  const canShowProvider = md >= 120 && c(config, "showProvider");
  const canShowInfo = md >= 140 && c(config, "showInfo", true) && info;
  const canShowRecord = md >= 180 && c(config, "showRecord", true) && record;
  const canShowBet = md >= 100 && c(config, "showBet") && !canShowRecord;

  // ─── Portrait layout (tall widget) ───
  if (isPortrait) {
    return (
      <div className="flex flex-col h-full w-full overflow-hidden">
        {canShowImage && gameImage && (
          <div className="flex-shrink-0 flex justify-center p-1" style={{ maxHeight: "45%" }}>
            <img
              src={gameImage}
              alt={playing.gameName}
              className="rounded-lg"
              style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
            />
          </div>
        )}
        <div className="flex-1 flex flex-col justify-center items-center min-h-0 px-2 py-1 text-center overflow-hidden">
          <p className="text-white/40 uppercase tracking-wider font-medium" style={{ fontSize: labelSize }}>Current Game</p>
          <p className="text-white font-bold truncate w-full leading-tight" style={{ fontSize: titleSize }}>
            {playing.gameName}
          </p>
          {canShowProvider && gameProvider && (
            <p className="text-white/40 truncate w-full" style={{ fontSize: detailSize }}>{gameProvider}</p>
          )}
          {canShowInfo && (
            <div className="flex gap-2 mt-1 justify-center flex-wrap">
              {info!.maxWin && (
                <div>
                  <p className="text-white/30 uppercase" style={{ fontSize: labelSize }}>Potential</p>
                  <p className="text-white font-semibold" style={{ fontSize: detailSize }}>{info!.maxWin}</p>
                </div>
              )}
              {info!.rtp && (
                <div>
                  <p className="text-white/30 uppercase" style={{ fontSize: labelSize }}>RTP</p>
                  <p className="text-white font-semibold" style={{ fontSize: detailSize }}>{info!.rtp}%</p>
                </div>
              )}
              {info!.volatility && (
                <div>
                  <p className="text-white/30 uppercase" style={{ fontSize: labelSize }}>Volatility</p>
                  <p className="text-white font-semibold" style={{ fontSize: detailSize }}>{info!.volatility}</p>
                </div>
              )}
            </div>
          )}
        </div>
        {canShowRecord && (
          <RecordSection atBet={atBet} record={record!} betSize={betSize} fontSize={detailSize} labelFontSize={labelSize} horizontal />
        )}
      </div>
    );
  }

  // ─── Landscape / default horizontal layout ───
  return (
    <div className="flex h-full w-full overflow-hidden">
      {canShowImage && gameImage && (
        <div className="h-full flex-shrink-0 flex items-center p-1" style={{ maxWidth: "35%" }}>
          <img
            src={gameImage}
            alt={playing.gameName}
            className="rounded-lg"
            style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
          />
        </div>
      )}
      <div className="flex-1 flex flex-col justify-center min-w-0 px-2 py-1 overflow-hidden">
        {!isLandscape || height >= 60 ? (
          <p className="text-white/40 uppercase tracking-wider font-medium" style={{ fontSize: labelSize }}>Current Game</p>
        ) : null}
        <p className="text-white font-bold truncate leading-tight" style={{ fontSize: titleSize }}>
          {playing.gameName}
        </p>
        {canShowProvider && gameProvider && height >= 50 && (
          <p className="text-white/40 truncate" style={{ fontSize: detailSize }}>{gameProvider}</p>
        )}
        {canShowInfo && height >= 70 && (
          <div className="flex gap-2 mt-1">
            {info!.maxWin && (
              <div className="min-w-0">
                <p className="text-white/30 uppercase" style={{ fontSize: labelSize }}>Potential</p>
                <p className="text-white font-semibold" style={{ fontSize: detailSize }}>{info!.maxWin}</p>
              </div>
            )}
            {info!.rtp && (
              <div className="min-w-0">
                <p className="text-white/30 uppercase" style={{ fontSize: labelSize }}>RTP</p>
                <p className="text-white font-semibold" style={{ fontSize: detailSize }}>{info!.rtp}%</p>
              </div>
            )}
            {info!.volatility && (
              <div className="min-w-0">
                <p className="text-white/30 uppercase" style={{ fontSize: labelSize }}>Volatility</p>
                <p className="text-white font-semibold" style={{ fontSize: detailSize }}>{info!.volatility}</p>
              </div>
            )}
          </div>
        )}
      </div>
      {canShowRecord && width >= 350 && (
        <RecordSection atBet={atBet} record={record!} betSize={betSize} fontSize={detailSize} labelFontSize={labelSize} />
      )}
      {canShowBet && (
        <div className="flex-shrink-0 flex flex-col justify-center px-2">
          <p className="text-white/40" style={{ fontSize: labelSize }}>BET</p>
          <p className="text-white font-bold" style={{ fontSize: detailSize }}>${parseFloat(playing.betSize).toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}

function RecordSection({
  atBet,
  record,
  betSize,
  fontSize,
  labelFontSize,
  horizontal,
}: {
  atBet: CurrentGameData["personalRecord"] extends null ? never : NonNullable<CurrentGameData["personalRecord"]>["atCurrentBet"];
  record: NonNullable<CurrentGameData["personalRecord"]>;
  betSize: string;
  fontSize: number;
  labelFontSize: number;
  horizontal?: boolean;
}) {
  if (horizontal) {
    return (
      <div className="flex-shrink-0 flex items-center justify-around px-2 py-1 border-t border-white/10">
        <div className="text-center">
          <p className="text-white/30 uppercase" style={{ fontSize: labelFontSize }}>Win</p>
          <p className="text-white font-bold" style={{ fontSize }}>
            {atBet ? formatCurrency(atBet.bestWin) : formatCurrency(record.biggestWin)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-white/30 uppercase" style={{ fontSize: labelFontSize }}>X</p>
          <p className="text-yellow-400 font-bold" style={{ fontSize }}>
            {atBet ? formatMultiplier(atBet.bestMulti) : formatMultiplier(record.biggestMultiplier)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-white/30 uppercase" style={{ fontSize: labelFontSize }}>Avg</p>
          <p className="text-white/70 font-bold" style={{ fontSize }}>
            {atBet ? formatCurrency(atBet.avgWin) : formatMultiplier(record.avgMultiplier)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 flex flex-col justify-center px-2 py-1 border-l border-white/10 overflow-hidden">
      <p className="text-yellow-400 uppercase tracking-wider font-medium mb-0.5" style={{ fontSize: labelFontSize }}>Personal Record</p>
      <div className="space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-white/40" style={{ fontSize: labelFontSize }}>WIN</span>
          <span className="text-white font-bold truncate" style={{ fontSize }}>
            {atBet ? formatCurrency(atBet.bestWin) : formatCurrency(record.biggestWin)}
            {atBet && <span className="text-white/30 ml-0.5" style={{ fontSize: labelFontSize }}>(${parseFloat(betSize).toFixed(0)})</span>}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-white/40" style={{ fontSize: labelFontSize }}>X</span>
          <span className="text-yellow-400 font-bold truncate" style={{ fontSize }}>
            {atBet ? formatMultiplier(atBet.bestMulti) : formatMultiplier(record.biggestMultiplier)}
            {atBet && <span className="text-white/30 ml-0.5" style={{ fontSize: labelFontSize }}>(${parseFloat(betSize).toFixed(0)})</span>}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-white/40" style={{ fontSize: labelFontSize }}>AVG</span>
          <span className="text-white/70 font-bold truncate" style={{ fontSize }}>
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
    <div className="flex items-center justify-center h-full w-full text-white/30 text-sm italic overflow-hidden">
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
      const showGame = c(config, "showGame") as boolean;
      const bwFontSize = c(config, "fontSize", 28) as number ?? 28;
      const bwScale = bwFontSize / 28;
      const mainSize = Math.max(14, Math.min(width * 0.14 * bwScale, height * (showGame ? 0.3 : 0.45) * bwScale, bwFontSize * 2));
      const subSize = Math.max(10, mainSize * 0.45);
      return (
        <div className="flex items-center justify-center h-full w-full px-3 overflow-hidden">
          <div className="text-center w-full min-w-0">
            <p className="text-yellow-400 font-bold leading-tight truncate" style={{ fontSize: mainSize }}>
              {formatMultiplier(bestEntry.multiplier!)}
            </p>
            {showGame && (
              <p className="text-white/60 truncate mt-1" style={{ fontSize: subSize }}>
                {bestEntry.gameName}
              </p>
            )}
          </div>
        </div>
      );
    }

    case "running-totals": {
      const configLayout = c(config, "layout", "auto");
      const isHorizontal = configLayout === "horizontal"
        ? true
        : configLayout === "vertical"
        ? false
        : width > height * 1.2;

      const showProfit = c(config, "showProfit") as boolean;
      const showAvg = c(config, "showAvg") as boolean;
      const statCount = 2 + (showProfit ? 1 : 0) + (showAvg ? 1 : 0);

      const configFontSize = c(config, "fontSize", 16) as number ?? 16;
      const fontScale = configFontSize / 16;
      const perItemW = isHorizontal ? width / statCount : width;
      const perItemH = isHorizontal ? height : height / statCount;
      const valSize = Math.max(12, Math.min(perItemW * 0.18 * fontScale, perItemH * 0.35 * fontScale, configFontSize * 2));
      const labelSize = Math.max(8, valSize * 0.5);

      return (
        <div
          className={`flex ${isHorizontal ? "flex-row" : "flex-col"} items-center justify-around h-full w-full px-3 overflow-hidden`}
        >
          <div className="text-center min-w-0">
            <p className="text-white/40 uppercase font-medium truncate" style={{ fontSize: labelSize }}>Cost</p>
            <p className="text-white font-bold truncate" style={{ fontSize: valSize }}>{formatCurrency(totalCost)}</p>
          </div>
          <div className="text-center min-w-0">
            <p className="text-white/40 uppercase font-medium truncate" style={{ fontSize: labelSize }}>Won</p>
            <p className="text-green-400 font-bold truncate" style={{ fontSize: valSize }}>{formatCurrency(totalWon)}</p>
          </div>
          {showProfit && (
            <div className="text-center min-w-0">
              <p className="text-white/40 uppercase font-medium truncate" style={{ fontSize: labelSize }}>Profit</p>
              <p className={`font-bold truncate ${profit >= 0 ? "text-green-400" : "text-red-400"}`} style={{ fontSize: valSize }}>
                {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
              </p>
            </div>
          )}
          {showAvg && (
            <div className="text-center min-w-0">
              <p className="text-white/40 uppercase font-medium truncate" style={{ fontSize: labelSize }}>Avg</p>
              <p className="text-yellow-400 font-bold truncate" style={{ fontSize: valSize }}>{formatMultiplier(avgMultiplier)}</p>
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
      const barThickness = Math.max(4, Math.min(minDim(width, height) * 0.3, 24));
      const labelSize = Math.max(9, Math.min(width * 0.04, height * 0.06, 16));

      if (isVerticalBar) {
        return (
          <div className="flex flex-row items-center justify-center w-full h-full py-3 gap-2 overflow-hidden">
            {c(config, "showLabel") && width >= 60 && (
              <div className="flex flex-col items-center text-white/50" style={{ fontSize: labelSize }}>
                <span style={{ writingMode: "vertical-lr", transform: "rotate(180deg)" }}>Progress</span>
                {c(config, "showCount") && <span className="mt-1">{done}/{total}</span>}
              </div>
            )}
            <div className="bg-white/10 rounded-full overflow-hidden relative" style={{ width: barThickness, height: "100%" }}>
              <div
                className="absolute bottom-0 w-full rounded-full"
                style={{ height: `${pct}%`, backgroundColor: barColor }}
              />
            </div>
          </div>
        );
      }

      return (
        <div className="flex flex-col justify-center h-full w-full px-3 overflow-hidden">
          {c(config, "showLabel") && height >= 40 && (
            <div className="flex justify-between text-white/50 mb-1" style={{ fontSize: labelSize }}>
              <span>Progress</span>
              {c(config, "showCount") && <span>{done}/{total}</span>}
            </div>
          )}
          <div className="bg-white/10 rounded-full overflow-hidden" style={{ height: barThickness }}>
            <div
              className="h-full rounded-full"
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
      const cfgFs = c(config, "fontSize", 14) as number ?? 14;
      const fScale = cfgFs / 14;
      const rowFontSize = Math.max(10, Math.min(width * 0.05 * fScale, height / Math.min(count, pending.length) / 2.2, cfgFs * 1.8));
      const maxVisible = Math.max(1, Math.floor(height / (rowFontSize * 2.2)));
      const visible = pending.slice(0, Math.min(count, maxVisible));
      return (
        <div className="h-full w-full px-2 py-1 space-y-0.5 overflow-hidden" style={{ fontSize: rowFontSize }}>
          {visible.map((e, i) => (
            <div key={e.id} className="flex items-center gap-2 text-white/70 overflow-hidden">
              <span className="text-white/30 flex-shrink-0 text-right" style={{ width: rowFontSize * 1.2, fontSize: rowFontSize * 0.8 }}>{i + 1}</span>
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
      const cfgFs2 = c(config, "fontSize", 14) as number ?? 14;
      const fScale2 = cfgFs2 / 14;
      const rowFontSize = Math.max(10, Math.min(width * 0.05 * fScale2, height / Math.min(count, recent.length) / 2.2, cfgFs2 * 1.8));
      const maxVisible = Math.max(1, Math.floor(height / (rowFontSize * 2.2)));
      const visible = recent.slice(0, maxVisible);
      return (
        <div className="h-full w-full px-2 py-1 space-y-0.5 overflow-hidden" style={{ fontSize: rowFontSize }}>
          {visible.map((e) => {
            const isWin = parseFloat(e.result!) > parseFloat(e.cost);
            return (
              <div key={e.id} className="flex items-center justify-between overflow-hidden">
                <span className="truncate text-white min-w-0">{e.gameName}</span>
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
      const cfgFs3 = c(config, "fontSize", 14) as number ?? 14;
      const fScale3 = cfgFs3 / 14;
      const rowFontSize = Math.max(10, Math.min(width * 0.05 * fScale3, height / Math.min(count, ranked.length) / 2.2, cfgFs3 * 1.8));
      const maxVisible = Math.max(1, Math.floor(height / (rowFontSize * 2.2)));
      const visible = ranked.slice(0, maxVisible);
      return (
        <div className="h-full w-full px-2 py-1 space-y-0.5 overflow-hidden" style={{ fontSize: rowFontSize }}>
          {visible.map((e, i) => (
            <div key={e.id} className="flex items-center gap-2 overflow-hidden">
              <span className={`font-bold flex-shrink-0 text-right ${i === 0 ? "text-yellow-400" : "text-white/40"}`} style={{ width: rowFontSize * 1.5 }}>
                #{i + 1}
              </span>
              <span className="truncate text-white min-w-0">{e.gameName}</span>
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
      const ctFontSize = c(config, "fontSize", 24) as number ?? 24;
      const ctScale = ctFontSize / 24;
      const adaptedFontSize = Math.max(10, Math.min(width * 0.08 * ctScale, height * 0.4 * ctScale, ctFontSize * 2));
      return (
        <div className="flex items-center justify-center h-full w-full px-3 overflow-hidden" style={{ textAlign: align as React.CSSProperties["textAlign"] }}>
          <p style={{ fontSize: adaptedFontSize, color, fontWeight: fontWeight as React.CSSProperties["fontWeight"] }} className="w-full leading-tight truncate">
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
        <div className="w-full h-full overflow-hidden">
          <img
            src={url}
            alt=""
            className="w-full h-full"
            style={{ objectFit: fit as React.CSSProperties["objectFit"] }}
          />
        </div>
      );
    }

    case "timer": {
      const color = c(config, "color", "#ffffff") as string ?? "#ffffff";
      const tmFontSize = c(config, "fontSize", 28) as number ?? 28;
      const tmScale = tmFontSize / 28;
      const adaptedSize = Math.max(12, Math.min(width * 0.12 * tmScale, height * 0.45 * tmScale, tmFontSize * 2));
      return (
        <div className="flex items-center justify-center h-full w-full overflow-hidden">
          <p style={{ fontSize: adaptedSize, color }} className="font-mono font-bold">
            00:00:00
          </p>
        </div>
      );
    }

    case "game-image": {
      if (!playing?.gameImage) return placeholder("Game Image");
      const nameSize = Math.max(10, Math.min(width * 0.05, 16));
      return (
        <div className="w-full h-full flex flex-col items-center justify-center overflow-hidden">
          <img
            src={playing.gameImage}
            alt={playing.gameName}
            className="max-w-full max-h-full flex-shrink-0"
            style={{ objectFit: (c(config, "fit", "contain") as string) as React.CSSProperties["objectFit"] }}
          />
          {c(config, "showName") && height >= 80 && (
            <p className="text-white mt-1 truncate w-full text-center flex-shrink-0" style={{ fontSize: nameSize }}>{playing.gameName}</p>
          )}
        </div>
      );
    }

    default:
      return placeholder(`Unknown: ${type}`);
  }
}
