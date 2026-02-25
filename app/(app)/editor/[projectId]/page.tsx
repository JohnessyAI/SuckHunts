"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  Eye,
  Save,
  Layers,
  GripVertical,
  Lock,
  Unlock,
  EyeOff,
} from "lucide-react";
import { WIDGET_TYPES } from "@/lib/overlay/widget-registry";
import WidgetRenderer from "@/components/overlay-renderer/WidgetRenderer";

interface Widget {
  id: string;
  type: string;
  label: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  visible: boolean;
  locked: boolean;
  opacity: number;
  config: Record<string, unknown>;
}

interface Scene {
  id: string;
  name: string;
  slug: string;
  width: number;
  height: number;
  background: string;
  position: number;
  widgets: Widget[];
}

interface Project {
  id: string;
  name: string;
  slug: string;
  activeSceneId: string | null;
  activeHuntId: string | null;
  scenes: Scene[];
}

export default function OverlayEditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{
    widgetId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [resizing, setResizing] = useState<{
    widgetId: string;
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  const fetchProject = useCallback(async () => {
    const res = await fetch(`/api/overlays/${projectId}`);
    if (!res.ok) {
      router.push("/editor");
      return;
    }
    const data = await res.json();
    setProject(data);
    if (!activeSceneId && data.activeSceneId) {
      setActiveSceneId(data.activeSceneId);
    } else if (!activeSceneId && data.scenes.length > 0) {
      setActiveSceneId(data.scenes[0].id);
    }
    setLoading(false);
  }, [projectId, router, activeSceneId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const activeScene = project?.scenes.find((s) => s.id === activeSceneId);
  const selectedWidget = activeScene?.widgets.find(
    (w) => w.id === selectedWidgetId
  );

  // Add widget
  const addWidget = async (type: string) => {
    if (!activeSceneId) return;
    const def = WIDGET_TYPES.find((w) => w.type === type);
    const res = await fetch(
      `/api/overlays/${projectId}/scenes/${activeSceneId}/widgets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          label: def?.label ?? type,
          width: def?.defaultWidth ?? 400,
          height: def?.defaultHeight ?? 200,
          config: def?.defaultConfig ?? {},
        }),
      }
    );
    if (res.ok) {
      const widget = await res.json();
      setSelectedWidgetId(widget.id);
      fetchProject();
    }
  };

  // Update widget
  const updateWidget = async (
    widgetId: string,
    data: Partial<Widget>
  ) => {
    if (!activeSceneId) return;
    await fetch(
      `/api/overlays/${projectId}/scenes/${activeSceneId}/widgets/${widgetId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
    fetchProject();
  };

  // Delete widget
  const deleteWidget = async (widgetId: string) => {
    if (!activeSceneId) return;
    await fetch(
      `/api/overlays/${projectId}/scenes/${activeSceneId}/widgets/${widgetId}`,
      { method: "DELETE" }
    );
    if (selectedWidgetId === widgetId) setSelectedWidgetId(null);
    fetchProject();
  };

  // Add scene
  const addScene = async () => {
    const name = prompt("Scene name:");
    if (!name?.trim()) return;
    const res = await fetch(`/api/overlays/${projectId}/scenes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (res.ok) {
      const scene = await res.json();
      setActiveSceneId(scene.id);
      fetchProject();
    }
  };

  // Delete scene
  const deleteScene = async (sceneId: string) => {
    await fetch(`/api/overlays/${projectId}/scenes/${sceneId}`, {
      method: "DELETE",
    });
    if (activeSceneId === sceneId) {
      setActiveSceneId(project?.scenes.find((s) => s.id !== sceneId)?.id ?? null);
    }
    fetchProject();
  };

  // Copy OBS URL
  const copyObsUrl = () => {
    if (!project) return;
    const url = `${window.location.origin}/o/${project.slug}`;
    navigator.clipboard.writeText(url);
  };

  // Mouse handlers for drag
  const handleMouseDown = (e: React.MouseEvent, widget: Widget) => {
    if (widget.locked) return;
    e.stopPropagation();
    setSelectedWidgetId(widget.id);
    setDragging({
      widgetId: widget.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: widget.x,
      origY: widget.y,
    });
  };

  const handleResizeDown = (e: React.MouseEvent, widget: Widget) => {
    if (widget.locked) return;
    e.stopPropagation();
    setResizing({
      widgetId: widget.id,
      startX: e.clientX,
      startY: e.clientY,
      origW: widget.width,
      origH: widget.height,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging) {
        const dx = (e.clientX - dragging.startX) / scale;
        const dy = (e.clientY - dragging.startY) / scale;
        // Update locally for smooth dragging
        setProject((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            scenes: prev.scenes.map((s) =>
              s.id === activeSceneId
                ? {
                    ...s,
                    widgets: s.widgets.map((w) =>
                      w.id === dragging.widgetId
                        ? {
                            ...w,
                            x: Math.round(dragging.origX + dx),
                            y: Math.round(dragging.origY + dy),
                          }
                        : w
                    ),
                  }
                : s
            ),
          };
        });
      }
      if (resizing) {
        const dx = (e.clientX - resizing.startX) / scale;
        const dy = (e.clientY - resizing.startY) / scale;
        setProject((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            scenes: prev.scenes.map((s) =>
              s.id === activeSceneId
                ? {
                    ...s,
                    widgets: s.widgets.map((w) =>
                      w.id === resizing.widgetId
                        ? {
                            ...w,
                            width: Math.max(50, Math.round(resizing.origW + dx)),
                            height: Math.max(30, Math.round(resizing.origH + dy)),
                          }
                        : w
                    ),
                  }
                : s
            ),
          };
        });
      }
    };

    const handleMouseUp = () => {
      if (dragging) {
        const widget = activeScene?.widgets.find((w) => w.id === dragging.widgetId);
        if (widget) {
          updateWidget(dragging.widgetId, { x: widget.x, y: widget.y });
        }
        setDragging(null);
      }
      if (resizing) {
        const widget = activeScene?.widgets.find((w) => w.id === resizing.widgetId);
        if (widget) {
          updateWidget(resizing.widgetId, { width: widget.width, height: widget.height });
        }
        setResizing(null);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        Loading editor...
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/editor"
            className="text-gray-500 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="font-outfit text-lg font-bold">{project.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={copyObsUrl}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all"
          >
            <Copy size={12} />
            Copy OBS URL
          </button>
          <Link
            href={`/o/${project.slug}`}
            target="_blank"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all"
          >
            <Eye size={12} />
            Preview
          </Link>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Left Panel — Scenes & Widgets */}
        <div className="w-56 flex-shrink-0 space-y-4 overflow-y-auto">
          {/* Scenes */}
          <div className="glass-card rounded-xl border border-white/5 p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Scenes
              </h3>
              <button
                onClick={addScene}
                className="text-red-500 hover:text-red-400"
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="space-y-1">
              {project.scenes.map((scene) => (
                <div
                  key={scene.id}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-sm cursor-pointer transition-all ${
                    scene.id === activeSceneId
                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                      : "text-gray-400 hover:bg-white/5 hover:text-white"
                  }`}
                  onClick={() => {
                    setActiveSceneId(scene.id);
                    setSelectedWidgetId(null);
                  }}
                >
                  <span className="truncate">{scene.name}</span>
                  {project.scenes.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteScene(scene.id);
                      }}
                      className="text-gray-600 hover:text-red-400 flex-shrink-0"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Widget Toolbox */}
          <div className="glass-card rounded-xl border border-white/5 p-3">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Add Widget
            </h3>
            <div className="space-y-1">
              {WIDGET_TYPES.map((wt) => (
                <button
                  key={wt.type}
                  onClick={() => addWidget(wt.type)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-white/5 hover:text-white transition-all text-left"
                >
                  <Plus size={12} className="flex-shrink-0 text-red-500" />
                  <span className="truncate">{wt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div
          className="flex-1 bg-[#0a0a0a] rounded-xl border border-white/5 overflow-hidden relative flex items-center justify-center"
          onClick={() => setSelectedWidgetId(null)}
        >
          <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
            <button
              onClick={() => setScale((s) => Math.max(0.2, s - 0.1))}
              className="w-7 h-7 flex items-center justify-center rounded bg-white/5 text-gray-400 hover:text-white text-xs"
            >
              -
            </button>
            <span className="text-xs text-gray-500 w-10 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(1, s + 0.1))}
              className="w-7 h-7 flex items-center justify-center rounded bg-white/5 text-gray-400 hover:text-white text-xs"
            >
              +
            </button>
          </div>

          <div
            ref={canvasRef}
            className="relative border border-white/10 bg-black"
            style={{
              width: (activeScene?.width ?? 1920) * scale,
              height: (activeScene?.height ?? 1080) * scale,
            }}
          >
            {/* Checkerboard for transparency */}
            {activeScene?.background === "transparent" && (
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    "repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%)",
                  backgroundSize: `${20 * scale}px ${20 * scale}px`,
                }}
              />
            )}

            {activeScene?.widgets
              .filter((w) => w.visible)
              .map((widget) => (
                <div
                  key={widget.id}
                  className={`absolute cursor-move group ${
                    selectedWidgetId === widget.id
                      ? "ring-2 ring-red-500 ring-offset-0"
                      : "hover:ring-1 hover:ring-white/20"
                  }`}
                  style={{
                    left: widget.x * scale,
                    top: widget.y * scale,
                    width: widget.width * scale,
                    height: widget.height * scale,
                    opacity: widget.opacity,
                    zIndex: widget.zIndex,
                    transform: widget.rotation
                      ? `rotate(${widget.rotation}deg)`
                      : undefined,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, widget)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedWidgetId(widget.id);
                  }}
                >
                  <div
                    className="w-full h-full overflow-hidden"
                    style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
                  >
                    <div
                      style={{
                        width: widget.width,
                        height: widget.height,
                      }}
                    >
                      <WidgetRenderer
                        type={widget.type}
                        config={widget.config}
                        width={widget.width}
                        height={widget.height}
                        isEditor
                      />
                    </div>
                  </div>

                  {/* Resize handle */}
                  {selectedWidgetId === widget.id && !widget.locked && (
                    <div
                      className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-500 cursor-se-resize rounded-sm"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleResizeDown(e, widget);
                      }}
                    />
                  )}

                  {/* Label */}
                  {selectedWidgetId === widget.id && (
                    <div className="absolute -top-5 left-0 text-[10px] text-red-400 whitespace-nowrap">
                      {widget.label || widget.type}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Right Panel — Properties */}
        <div className="w-56 flex-shrink-0 overflow-y-auto">
          <div className="glass-card rounded-xl border border-white/5 p-3">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
              Properties
            </h3>

            {selectedWidget ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">
                    Type
                  </label>
                  <p className="text-sm text-white">{selectedWidget.label || selectedWidget.type}</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase">X</label>
                    <input
                      type="number"
                      value={selectedWidget.x}
                      onChange={(e) =>
                        updateWidget(selectedWidget.id, {
                          x: parseInt(e.target.value) || 0,
                        })
                      }
                      className="form-input text-xs py-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase">Y</label>
                    <input
                      type="number"
                      value={selectedWidget.y}
                      onChange={(e) =>
                        updateWidget(selectedWidget.id, {
                          y: parseInt(e.target.value) || 0,
                        })
                      }
                      className="form-input text-xs py-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase">W</label>
                    <input
                      type="number"
                      value={selectedWidget.width}
                      onChange={(e) =>
                        updateWidget(selectedWidget.id, {
                          width: parseInt(e.target.value) || 50,
                        })
                      }
                      className="form-input text-xs py-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase">H</label>
                    <input
                      type="number"
                      value={selectedWidget.height}
                      onChange={(e) =>
                        updateWidget(selectedWidget.id, {
                          height: parseInt(e.target.value) || 30,
                        })
                      }
                      className="form-input text-xs py-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 uppercase">
                    Opacity
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={selectedWidget.opacity}
                    onChange={(e) =>
                      updateWidget(selectedWidget.id, {
                        opacity: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-red-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      updateWidget(selectedWidget.id, {
                        locked: !selectedWidget.locked,
                      })
                    }
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-all ${
                      selectedWidget.locked
                        ? "border-yellow-500/30 text-yellow-400"
                        : "border-white/10 text-gray-400"
                    }`}
                  >
                    {selectedWidget.locked ? (
                      <Lock size={10} />
                    ) : (
                      <Unlock size={10} />
                    )}
                    {selectedWidget.locked ? "Locked" : "Lock"}
                  </button>
                  <button
                    onClick={() =>
                      updateWidget(selectedWidget.id, {
                        visible: !selectedWidget.visible,
                      })
                    }
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-white/10 text-gray-400"
                  >
                    {selectedWidget.visible ? (
                      <Eye size={10} />
                    ) : (
                      <EyeOff size={10} />
                    )}
                  </button>
                </div>

                <button
                  onClick={() => deleteWidget(selectedWidget.id)}
                  className="w-full flex items-center justify-center gap-1 text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-2 py-1.5 rounded-lg transition-all"
                >
                  <Trash2 size={12} />
                  Delete Widget
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-600">
                Select a widget on the canvas to edit its properties.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
