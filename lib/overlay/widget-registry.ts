export interface WidgetType {
  type: string;
  label: string;
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultConfig: Record<string, unknown>;
  category: "hunt" | "display" | "media";
}

export const WIDGET_TYPES: WidgetType[] = [
  {
    type: "hunt-table",
    label: "Hunt Table",
    description: "Full list of games in the current hunt",
    defaultWidth: 600,
    defaultHeight: 400,
    defaultConfig: { showBet: true, showCost: true, showResult: true, showMultiplier: true, autoScroll: true, scrollSpeed: 30, fontSize: 14 },
    category: "hunt",
  },
  {
    type: "current-game",
    label: "Currently Playing",
    description: "Game info, stats & personal record",
    defaultWidth: 650,
    defaultHeight: 140,
    defaultConfig: { showProvider: true, showBet: true, showImage: true, showInfo: true, showRecord: true, fontSize: 20, bgColor: "#000000", bgOpacity: 0.7, borderRadius: 12, padding: 0 },
    category: "hunt",
  },
  {
    type: "biggest-win",
    label: "Biggest Win",
    description: "The highest multiplier result so far",
    defaultWidth: 350,
    defaultHeight: 120,
    defaultConfig: { showGame: true, fontSize: 28 },
    category: "hunt",
  },
  {
    type: "running-totals",
    label: "Running Totals",
    description: "Cost, Won, Profit, Avg Multiplier",
    defaultWidth: 500,
    defaultHeight: 80,
    defaultConfig: { layout: "horizontal", showProfit: true, showAvg: true, fontSize: 16 },
    category: "hunt",
  },
  {
    type: "progress-bar",
    label: "Progress Bar",
    description: "How many bonuses have been opened",
    defaultWidth: 400,
    defaultHeight: 50,
    defaultConfig: { showLabel: true, showCount: true, barColor: "#ef4444" },
    category: "hunt",
  },
  {
    type: "next-up",
    label: "Next Up",
    description: "The next few games to be played",
    defaultWidth: 350,
    defaultHeight: 200,
    defaultConfig: { count: 3, showBet: true, fontSize: 14 },
    category: "hunt",
  },
  {
    type: "recent-results",
    label: "Recent Results",
    description: "Last few completed entries",
    defaultWidth: 400,
    defaultHeight: 200,
    defaultConfig: { count: 5, showMultiplier: true, fontSize: 14 },
    category: "hunt",
  },
  {
    type: "leaderboard",
    label: "Top Wins",
    description: "Top multiplier results ranked",
    defaultWidth: 350,
    defaultHeight: 300,
    defaultConfig: { count: 5, fontSize: 14 },
    category: "hunt",
  },
  {
    type: "custom-text",
    label: "Custom Text",
    description: "Static text with custom styling",
    defaultWidth: 300,
    defaultHeight: 60,
    defaultConfig: { text: "Your text here", fontSize: 24, color: "#ffffff", fontWeight: "bold", align: "center" },
    category: "display",
  },
  {
    type: "image",
    label: "Image",
    description: "Display an image from URL",
    defaultWidth: 300,
    defaultHeight: 200,
    defaultConfig: { url: "", fit: "contain" },
    category: "media",
  },
  {
    type: "timer",
    label: "Timer",
    description: "Countdown or elapsed timer",
    defaultWidth: 200,
    defaultHeight: 60,
    defaultConfig: { mode: "elapsed", fontSize: 28, color: "#ffffff" },
    category: "display",
  },
  {
    type: "game-image",
    label: "Game Image",
    description: "Image of the currently playing game",
    defaultWidth: 300,
    defaultHeight: 200,
    defaultConfig: { fit: "contain", showName: false },
    category: "hunt",
  },
];

export function getWidgetType(type: string): WidgetType | undefined {
  return WIDGET_TYPES.find((w) => w.type === type);
}
