"use client";

import { useRef, useState } from "react";
import { Upload, Image as ImageIcon } from "lucide-react";

interface WidgetConfigPanelProps {
  widgetType: string;
  config: Record<string, unknown>;
  onConfigChange: (key: string, value: unknown) => void;
}

export default function WidgetConfigPanel({
  widgetType,
  config,
  onConfigChange,
}: WidgetConfigPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        onConfigChange("url", data.url);
      } else {
        setUploadError(data.error || "Upload failed");
      }
    } catch {
      setUploadError("Network error — could not upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  switch (widgetType) {
    case "image":
      return (
        <div className="space-y-2">
          <label className="text-[10px] text-gray-500 uppercase">Image</label>
          {config.url ? (
            <div className="relative rounded-lg overflow-hidden border border-white/10">
              <img
                src={config.url as string}
                alt=""
                className="w-full h-20 object-cover"
              />
              <button
                onClick={() => onConfigChange("url", "")}
                className="absolute top-1 right-1 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded"
              >
                Remove
              </button>
            </div>
          ) : null}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-1.5 text-xs border border-dashed border-white/20 hover:border-red-500/40 text-gray-400 hover:text-white px-2 py-2 rounded-lg transition-all"
          >
            {uploading ? (
              "Uploading..."
            ) : (
              <>
                <Upload size={12} />
                Upload Image
              </>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          {uploadError && (
            <p className="text-[10px] text-red-400">{uploadError}</p>
          )}
          <div>
            <label className="text-[10px] text-gray-500 uppercase">
              Or paste URL
            </label>
            <input
              type="text"
              value={(config.url as string) || ""}
              onChange={(e) => onConfigChange("url", e.target.value)}
              placeholder="https://..."
              className="form-input text-xs py-1"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase">Fit</label>
            <select
              value={(config.fit as string) || "contain"}
              onChange={(e) => onConfigChange("fit", e.target.value)}
              className="form-input text-xs py-1"
            >
              <option value="contain">Contain</option>
              <option value="cover">Cover</option>
              <option value="fill">Stretch</option>
            </select>
          </div>
        </div>
      );

    case "custom-text":
      return (
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-gray-500 uppercase">Text</label>
            <input
              type="text"
              value={(config.text as string) || ""}
              onChange={(e) => onConfigChange("text", e.target.value)}
              className="form-input text-xs py-1"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase">
              Font Size
            </label>
            <input
              type="number"
              value={(config.fontSize as number) || 24}
              onChange={(e) =>
                onConfigChange("fontSize", parseInt(e.target.value) || 24)
              }
              className="form-input text-xs py-1"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={(config.color as string) || "#ffffff"}
                onChange={(e) => onConfigChange("color", e.target.value)}
                className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={(config.color as string) || "#ffffff"}
                onChange={(e) => onConfigChange("color", e.target.value)}
                className="form-input text-xs py-1 flex-1"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase">
              Font Weight
            </label>
            <select
              value={(config.fontWeight as string) || "bold"}
              onChange={(e) => onConfigChange("fontWeight", e.target.value)}
              className="form-input text-xs py-1"
            >
              <option value="normal">Normal</option>
              <option value="bold">Bold</option>
              <option value="100">Thin</option>
              <option value="300">Light</option>
              <option value="500">Medium</option>
              <option value="600">Semibold</option>
              <option value="800">Extra Bold</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase">Align</label>
            <select
              value={(config.align as string) || "center"}
              onChange={(e) => onConfigChange("align", e.target.value)}
              className="form-input text-xs py-1"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        </div>
      );

    case "hunt-table":
      return (
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-gray-500 uppercase">
              Font Size
            </label>
            <input
              type="number"
              value={(config.fontSize as number) || 14}
              onChange={(e) =>
                onConfigChange("fontSize", parseInt(e.target.value) || 14)
              }
              className="form-input text-xs py-1"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase">
              Max Rows
            </label>
            <input
              type="number"
              value={(config.maxRows as number) || 20}
              onChange={(e) =>
                onConfigChange("maxRows", parseInt(e.target.value) || 20)
              }
              className="form-input text-xs py-1"
            />
          </div>
          <ToggleOption label="Show Cost" configKey="showCost" config={config} onChange={onConfigChange} />
          <ToggleOption label="Show Result" configKey="showResult" config={config} onChange={onConfigChange} />
          <ToggleOption label="Show Multiplier" configKey="showMultiplier" config={config} onChange={onConfigChange} />
          <ToggleOption label="Show Bet" configKey="showBet" config={config} onChange={onConfigChange} />
        </div>
      );

    case "current-game":
      return (
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-gray-500 uppercase">
              Font Size
            </label>
            <input
              type="number"
              value={(config.fontSize as number) || 24}
              onChange={(e) =>
                onConfigChange("fontSize", parseInt(e.target.value) || 24)
              }
              className="form-input text-xs py-1"
            />
          </div>
          <ToggleOption label="Show Provider" configKey="showProvider" config={config} onChange={onConfigChange} />
          <ToggleOption label="Show Bet" configKey="showBet" config={config} onChange={onConfigChange} />
        </div>
      );

    case "biggest-win":
      return (
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-gray-500 uppercase">
              Font Size
            </label>
            <input
              type="number"
              value={(config.fontSize as number) || 28}
              onChange={(e) =>
                onConfigChange("fontSize", parseInt(e.target.value) || 28)
              }
              className="form-input text-xs py-1"
            />
          </div>
          <ToggleOption label="Show Game Name" configKey="showGame" config={config} onChange={onConfigChange} />
        </div>
      );

    case "running-totals":
      return (
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-gray-500 uppercase">
              Font Size
            </label>
            <input
              type="number"
              value={(config.fontSize as number) || 16}
              onChange={(e) =>
                onConfigChange("fontSize", parseInt(e.target.value) || 16)
              }
              className="form-input text-xs py-1"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase">Layout</label>
            <select
              value={(config.layout as string) || "horizontal"}
              onChange={(e) => onConfigChange("layout", e.target.value)}
              className="form-input text-xs py-1"
            >
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
            </select>
          </div>
          <ToggleOption label="Show Profit" configKey="showProfit" config={config} onChange={onConfigChange} />
          <ToggleOption label="Show Average" configKey="showAvg" config={config} onChange={onConfigChange} />
        </div>
      );

    case "progress-bar":
      return (
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-gray-500 uppercase">
              Bar Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={(config.barColor as string) || "#ef4444"}
                onChange={(e) => onConfigChange("barColor", e.target.value)}
                className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={(config.barColor as string) || "#ef4444"}
                onChange={(e) => onConfigChange("barColor", e.target.value)}
                className="form-input text-xs py-1 flex-1"
              />
            </div>
          </div>
          <ToggleOption label="Show Label" configKey="showLabel" config={config} onChange={onConfigChange} />
          <ToggleOption label="Show Count" configKey="showCount" config={config} onChange={onConfigChange} />
        </div>
      );

    case "next-up":
    case "recent-results":
    case "leaderboard":
      return (
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-gray-500 uppercase">Count</label>
            <input
              type="number"
              value={(config.count as number) || 5}
              onChange={(e) =>
                onConfigChange("count", parseInt(e.target.value) || 5)
              }
              className="form-input text-xs py-1"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase">
              Font Size
            </label>
            <input
              type="number"
              value={(config.fontSize as number) || 14}
              onChange={(e) =>
                onConfigChange("fontSize", parseInt(e.target.value) || 14)
              }
              className="form-input text-xs py-1"
            />
          </div>
          {widgetType === "next-up" && (
            <ToggleOption label="Show Bet" configKey="showBet" config={config} onChange={onConfigChange} />
          )}
          {widgetType === "recent-results" && (
            <ToggleOption label="Show Multiplier" configKey="showMultiplier" config={config} onChange={onConfigChange} />
          )}
        </div>
      );

    case "timer":
      return (
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-gray-500 uppercase">
              Font Size
            </label>
            <input
              type="number"
              value={(config.fontSize as number) || 28}
              onChange={(e) =>
                onConfigChange("fontSize", parseInt(e.target.value) || 28)
              }
              className="form-input text-xs py-1"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase">Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={(config.color as string) || "#ffffff"}
                onChange={(e) => onConfigChange("color", e.target.value)}
                className="w-8 h-8 rounded border border-white/10 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={(config.color as string) || "#ffffff"}
                onChange={(e) => onConfigChange("color", e.target.value)}
                className="form-input text-xs py-1 flex-1"
              />
            </div>
          </div>
        </div>
      );

    case "game-image":
      return (
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-gray-500 uppercase">Fit</label>
            <select
              value={(config.fit as string) || "contain"}
              onChange={(e) => onConfigChange("fit", e.target.value)}
              className="form-input text-xs py-1"
            >
              <option value="contain">Contain</option>
              <option value="cover">Cover</option>
              <option value="fill">Stretch</option>
            </select>
          </div>
          <ToggleOption label="Show Name" configKey="showName" config={config} onChange={onConfigChange} />
        </div>
      );

    default:
      return null;
  }
}

function ToggleOption({
  label,
  configKey,
  config,
  onChange,
}: {
  label: string;
  configKey: string;
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const value = config[configKey] as boolean;
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-[10px] text-gray-500 uppercase group-hover:text-gray-300 transition-colors">
        {label}
      </span>
      <button
        onClick={() => onChange(configKey, !value)}
        className={`w-8 h-4 rounded-full transition-all relative ${
          value ? "bg-red-500" : "bg-white/10"
        }`}
      >
        <div
          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
            value ? "left-4" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}
