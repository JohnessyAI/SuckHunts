"use client";

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

interface WidgetRendererProps {
  type: string;
  config: Record<string, unknown>;
  width: number;
  height: number;
  huntData?: HuntData | null;
  isEditor?: boolean;
}

export default function WidgetRenderer({
  type,
  config,
  width,
  height,
  huntData,
  isEditor,
}: WidgetRendererProps) {
  const def = getWidgetType(type);
  const refW = def?.defaultWidth ?? width;
  const refH = def?.defaultHeight ?? height;
  const needsScale = width !== refW || height !== refH;

  const content = (
    <WidgetContent
      type={type}
      config={config}
      huntData={huntData}
      isEditor={isEditor}
    />
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

function WidgetContent({
  type,
  config,
  huntData,
  isEditor,
}: {
  type: string;
  config: Record<string, unknown>;
  huntData?: HuntData | null;
  isEditor?: boolean;
}) {
  const entries = huntData?.entries ?? [];
  const playing = entries.find((e) => e.status === "playing");
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
      const fontSize = c(config, "fontSize", 14) as number ?? 14;
      const maxRows = c(config, "maxRows", 20) as number ?? 20;
      if (!entries.length) return placeholder("Hunt Table");
      return (
        <div className="h-full overflow-hidden" style={{ fontSize }}>
          <div className="space-y-0.5">
            {entries.slice(0, maxRows).map((e, i) => {
              const isWin = e.result && parseFloat(e.result) > parseFloat(e.cost);
              return (
                <div
                  key={e.id}
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
                        {e.result ? formatCurrency(e.result) : "—"}
                      </span>
                    )}
                    {c(config, "showMultiplier") && (
                      <span className={e.status === "playing" ? "text-red-400 animate-pulse" : e.multiplier ? "text-yellow-400" : "text-white/20"}>
                        {e.status === "playing" ? "LIVE" : e.multiplier ? formatMultiplier(e.multiplier) : "—"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    case "current-game": {
      const fontSize = c(config, "fontSize", 14) as number ?? 24;
      if (!playing) return placeholder("Currently Playing");
      return (
        <div className="flex items-center h-full px-4 gap-4">
          <div className="min-w-0">
            <p className="text-white font-bold truncate" style={{ fontSize }}>
              {playing.gameName}
            </p>
            {c(config, "showProvider") && playing.gameProvider && (
              <p className="text-white/40 text-sm">{playing.gameProvider}</p>
            )}
          </div>
          {c(config, "showBet") && (
            <div className="ml-auto text-right flex-shrink-0">
              <p className="text-white/40 text-xs">BET</p>
              <p className="text-white font-bold">${parseFloat(playing.betSize).toFixed(2)}</p>
            </div>
          )}
        </div>
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
        <div className="flex items-center justify-center h-full px-4" style={{ textAlign: align as any }}>
          <p style={{ fontSize, color, fontWeight: fontWeight as any }} className="w-full">
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
