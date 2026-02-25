"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  Eye,
  Lock,
  Unlock,
  EyeOff,
  X,
  ChevronDown,
} from "lucide-react";
import { WIDGET_TYPES } from "@/lib/overlay/widget-registry";
import WidgetRenderer from "@/components/overlay-renderer/WidgetRenderer";
import WidgetConfigPanel from "@/components/overlay-editor/WidgetConfigPanel";
import { MOCK_HUNT_DATA } from "@/lib/overlay/mock-hunt-data";

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

type ResizeEdge =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export default function OverlayEditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [showScenePicker, setShowScenePicker] = useState(false);
  const [dragging, setDragging] = useState<{
    widgetId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [resizing, setResizing] = useState<{
    widgetId: string;
    edge: ResizeEdge;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

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

  // Observe canvas container size and auto-fit zoom
  useEffect(() => {
    const el = canvasContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ w: width, h: height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const activeScene = project?.scenes.find((s) => s.id === activeSceneId);
  const selectedWidget = activeScene?.widgets.find(
    (w) => w.id === selectedWidgetId
  );

  // Auto-fit scale when container size changes
  useEffect(() => {
    if (containerSize.w === 0 || containerSize.h === 0) return;
    const canvasW = activeScene?.width ?? 1920;
    const canvasH = activeScene?.height ?? 1080;
    const padding = 40; // px padding around canvas
    const fitScale = Math.min(
      (containerSize.w - padding) / canvasW,
      (containerSize.h - padding) / canvasH,
      1 // never go above 100%
    );
    setScale(Math.max(0.15, Math.round(fitScale * 100) / 100));
  }, [containerSize, activeScene?.width, activeScene?.height]);

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
      setShowWidgetPicker(false);
      fetchProject();
    }
  };

  // Optimistic update widget
  const updateWidget = useCallback(
    (widgetId: string, data: Partial<Widget>) => {
      if (!activeSceneId) return;
      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          scenes: prev.scenes.map((s) =>
            s.id === activeSceneId
              ? {
                  ...s,
                  widgets: s.widgets.map((w) =>
                    w.id === widgetId ? { ...w, ...data } : w
                  ),
                }
              : s
          ),
        };
      });
      fetch(
        `/api/overlays/${projectId}/scenes/${activeSceneId}/widgets/${widgetId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
    },
    [activeSceneId, projectId]
  );

  // Delete widget
  const deleteWidget = async (widgetId: string) => {
    if (!activeSceneId) return;
    setProject((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        scenes: prev.scenes.map((s) =>
          s.id === activeSceneId
            ? { ...s, widgets: s.widgets.filter((w) => w.id !== widgetId) }
            : s
        ),
      };
    });
    if (selectedWidgetId === widgetId) setSelectedWidgetId(null);
    await fetch(
      `/api/overlays/${projectId}/scenes/${activeSceneId}/widgets/${widgetId}`,
      { method: "DELETE" }
    );
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
      setShowScenePicker(false);
      fetchProject();
    }
  };

  // Delete scene
  const deleteScene = async (sceneId: string) => {
    await fetch(`/api/overlays/${projectId}/scenes/${sceneId}`, {
      method: "DELETE",
    });
    if (activeSceneId === sceneId) {
      setActiveSceneId(
        project?.scenes.find((s) => s.id !== sceneId)?.id ?? null
      );
    }
    setShowScenePicker(false);
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

  const handleResizeDown = (
    e: React.MouseEvent,
    widget: Widget,
    edge: ResizeEdge
  ) => {
    if (widget.locked) return;
    e.stopPropagation();
    e.preventDefault();
    setResizing({
      widgetId: widget.id,
      edge,
      startX: e.clientX,
      startY: e.clientY,
      origX: widget.x,
      origY: widget.y,
      origW: widget.width,
      origH: widget.height,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragging) {
        const dx = (e.clientX - dragging.startX) / scale;
        const dy = (e.clientY - dragging.startY) / scale;
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
        const edge = resizing.edge;

        setProject((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            scenes: prev.scenes.map((s) =>
              s.id === activeSceneId
                ? {
                    ...s,
                    widgets: s.widgets.map((w) => {
                      if (w.id !== resizing.widgetId) return w;

                      let newX = resizing.origX;
                      let newY = resizing.origY;
                      let newW = resizing.origW;
                      let newH = resizing.origH;

                      if (
                        edge === "right" ||
                        edge === "top-right" ||
                        edge === "bottom-right"
                      ) {
                        newW = Math.max(50, Math.round(resizing.origW + dx));
                      }
                      if (
                        edge === "left" ||
                        edge === "top-left" ||
                        edge === "bottom-left"
                      ) {
                        const maxDx = resizing.origW - 50;
                        const clampedDx = Math.min(dx, maxDx);
                        newX = Math.round(resizing.origX + clampedDx);
                        newW = Math.max(
                          50,
                          Math.round(resizing.origW - clampedDx)
                        );
                      }
                      if (
                        edge === "bottom" ||
                        edge === "bottom-left" ||
                        edge === "bottom-right"
                      ) {
                        newH = Math.max(30, Math.round(resizing.origH + dy));
                      }
                      if (
                        edge === "top" ||
                        edge === "top-left" ||
                        edge === "top-right"
                      ) {
                        const maxDy = resizing.origH - 30;
                        const clampedDy = Math.min(dy, maxDy);
                        newY = Math.round(resizing.origY + clampedDy);
                        newH = Math.max(
                          30,
                          Math.round(resizing.origH - clampedDy)
                        );
                      }

                      return {
                        ...w,
                        x: newX,
                        y: newY,
                        width: newW,
                        height: newH,
                      };
                    }),
                  }
                : s
            ),
          };
        });
      }
    };

    const handleMouseUp = () => {
      if (dragging) {
        const widget = activeScene?.widgets.find(
          (w) => w.id === dragging.widgetId
        );
        if (widget) {
          updateWidget(dragging.widgetId, { x: widget.x, y: widget.y });
        }
        setDragging(null);
      }
      if (resizing) {
        const widget = activeScene?.widgets.find(
          (w) => w.id === resizing.widgetId
        );
        if (widget) {
          updateWidget(resizing.widgetId, {
            x: widget.x,
            y: widget.y,
            width: widget.width,
            height: widget.height,
          });
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

  // Resize handles config
  const resizeHandles = useMemo(
    () => [
      {
        edge: "top-left" as ResizeEdge,
        cursor: "nwse-resize",
        cls: "-top-1.5 -left-1.5 w-3 h-3",
      },
      {
        edge: "top" as ResizeEdge,
        cursor: "ns-resize",
        cls: "-top-1 left-1/2 -translate-x-1/2 w-5 h-2",
      },
      {
        edge: "top-right" as ResizeEdge,
        cursor: "nesw-resize",
        cls: "-top-1.5 -right-1.5 w-3 h-3",
      },
      {
        edge: "right" as ResizeEdge,
        cursor: "ew-resize",
        cls: "top-1/2 -right-1 -translate-y-1/2 w-2 h-5",
      },
      {
        edge: "bottom-right" as ResizeEdge,
        cursor: "nwse-resize",
        cls: "-bottom-1.5 -right-1.5 w-3 h-3",
      },
      {
        edge: "bottom" as ResizeEdge,
        cursor: "ns-resize",
        cls: "-bottom-1 left-1/2 -translate-x-1/2 w-5 h-2",
      },
      {
        edge: "bottom-left" as ResizeEdge,
        cursor: "nesw-resize",
        cls: "-bottom-1.5 -left-1.5 w-3 h-3",
      },
      {
        edge: "left" as ResizeEdge,
        cursor: "ew-resize",
        cls: "top-1/2 -left-1 -translate-y-1/2 w-2 h-5",
      },
    ],
    []
  );

  // Group widget types by category
  const widgetsByCategory = useMemo(() => {
    const groups: Record<string, typeof WIDGET_TYPES> = {};
    for (const wt of WIDGET_TYPES) {
      if (!groups[wt.category]) groups[wt.category] = [];
      groups[wt.category].push(wt);
    }
    return groups;
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        Loading editor...
      </div>
    );
  }

  if (!project) return null;

  return (
    // Full-screen overlay that covers the app sidebar + container
    <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col">
      {/* Top toolbar */}
      <div className="h-12 border-b border-white/5 bg-black/80 backdrop-blur-xl flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/editor"
            className="text-gray-500 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <span className="text-sm font-medium text-white truncate max-w-[200px]">
            {project.name}
          </span>

          {/* Scene selector */}
          <div className="relative ml-2">
            <button
              onClick={() => setShowScenePicker(!showScenePicker)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-white/10 px-2.5 py-1 rounded-lg hover:bg-white/5 transition-all"
            >
              {activeScene?.name ?? "Scene"}
              <ChevronDown size={12} />
            </button>
            {showScenePicker && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowScenePicker(false)}
                />
                <div className="absolute top-full left-0 mt-1 w-48 glass-card rounded-lg border border-white/10 p-1.5 z-50 shadow-2xl">
                  {project.scenes.map((scene) => (
                    <div
                      key={scene.id}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs cursor-pointer transition-all ${
                        scene.id === activeSceneId
                          ? "bg-red-500/10 text-red-400"
                          : "text-gray-400 hover:bg-white/5 hover:text-white"
                      }`}
                      onClick={() => {
                        setActiveSceneId(scene.id);
                        setSelectedWidgetId(null);
                        setShowScenePicker(false);
                      }}
                    >
                      <span className="truncate">{scene.name}</span>
                      {project.scenes.length > 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteScene(scene.id);
                          }}
                          className="text-gray-600 hover:text-red-400 flex-shrink-0 ml-2"
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addScene}
                    className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-gray-500 hover:bg-white/5 hover:text-white transition-all mt-1 border-t border-white/5 pt-2"
                  >
                    <Plus size={10} />
                    New Scene
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={() => setScale((s) => Math.max(0.1, +(s - 0.05).toFixed(2)))}
              className="w-6 h-6 flex items-center justify-center rounded bg-white/5 text-gray-400 hover:text-white text-xs"
            >
              -
            </button>
            <span className="text-[10px] text-gray-500 w-10 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(1, +(s + 0.05).toFixed(2)))}
              className="w-6 h-6 flex items-center justify-center rounded bg-white/5 text-gray-400 hover:text-white text-xs"
            >
              +
            </button>
          </div>

          <button
            onClick={copyObsUrl}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-white/10 px-2.5 py-1 rounded-lg hover:bg-white/5 transition-all"
          >
            <Copy size={11} />
            OBS URL
          </button>
          <Link
            href={`/o/${project.slug}`}
            target="_blank"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-white/10 px-2.5 py-1 rounded-lg hover:bg-white/5 transition-all"
          >
            <Eye size={11} />
            Preview
          </Link>
        </div>
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative min-h-0">
        {/* Canvas container — takes full space */}
        <div
          ref={canvasContainerRef}
          className="absolute inset-0 overflow-auto flex items-center justify-center bg-[#0a0a0a]"
          onClick={() => {
            setSelectedWidgetId(null);
            setShowWidgetPicker(false);
          }}
        >
          <div
            className="relative border border-white/10 bg-black flex-shrink-0"
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
                  className={`absolute ${
                    widget.locked ? "cursor-default" : "cursor-move"
                  } ${
                    selectedWidgetId === widget.id
                      ? "ring-2 ring-red-500"
                      : "hover:ring-1 hover:ring-white/30"
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
                  <div className="w-full h-full overflow-hidden pointer-events-none">
                    <div
                      style={{
                        width: widget.width,
                        height: widget.height,
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                      }}
                    >
                      <WidgetRenderer
                        type={widget.type}
                        config={widget.config}
                        width={widget.width}
                        height={widget.height}
                        huntData={
                          project.activeHuntId ? undefined : MOCK_HUNT_DATA
                        }
                        isEditor
                      />
                    </div>
                  </div>

                  {/* Resize handles */}
                  {selectedWidgetId === widget.id &&
                    !widget.locked &&
                    resizeHandles.map((h) => (
                      <div
                        key={h.edge}
                        className={`absolute ${h.cls} bg-red-500 rounded-sm z-50`}
                        style={{ cursor: h.cursor }}
                        onMouseDown={(e) =>
                          handleResizeDown(e, widget, h.edge)
                        }
                      />
                    ))}

                  {/* Label */}
                  {selectedWidgetId === widget.id && (
                    <div className="absolute -top-5 left-0 text-[10px] text-red-400 whitespace-nowrap bg-black/80 px-1.5 py-0.5 rounded">
                      {widget.label || widget.type}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Add Widget button — bottom left floating */}
        <div className="absolute bottom-4 left-4 z-30">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowWidgetPicker(!showWidgetPicker);
            }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-red-500/25 transition-all hover:scale-105"
          >
            <Plus size={16} />
            Add Widget
          </button>

          {/* Widget picker popup */}
          {showWidgetPicker && (
            <div
              className="absolute bottom-full left-0 mb-2 w-72 glass-card rounded-xl border border-white/10 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">Add Widget</h3>
                <button
                  onClick={() => setShowWidgetPicker(false)}
                  className="text-gray-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="p-2 max-h-80 overflow-y-auto space-y-3">
                {Object.entries(widgetsByCategory).map(([cat, widgets]) => (
                  <div key={cat}>
                    <h4 className="text-[10px] text-gray-500 uppercase tracking-wider px-2 mb-1">
                      {cat === "hunt"
                        ? "Hunt Data"
                        : cat === "display"
                        ? "Display"
                        : "Media"}
                    </h4>
                    {widgets.map((wt) => (
                      <button
                        key={wt.type}
                        onClick={() => addWidget(wt.type)}
                        className="w-full flex items-start gap-2.5 px-2 py-2 rounded-lg text-left hover:bg-white/5 transition-all group"
                      >
                        <Plus
                          size={14}
                          className="flex-shrink-0 text-red-500 mt-0.5"
                        />
                        <div>
                          <p className="text-xs text-white group-hover:text-red-400 transition-colors">
                            {wt.label}
                          </p>
                          <p className="text-[10px] text-gray-600">
                            {wt.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Widget layer list — bottom center floating */}
        {activeScene && activeScene.widgets.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
            <div className="flex items-center gap-1 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl px-2 py-1.5 shadow-lg">
              {activeScene.widgets.map((w) => (
                <button
                  key={w.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedWidgetId(w.id);
                  }}
                  className={`text-[10px] px-2 py-1 rounded-lg transition-all truncate max-w-[100px] ${
                    selectedWidgetId === w.id
                      ? "bg-red-500/20 text-red-400"
                      : w.visible
                      ? "text-gray-400 hover:text-white hover:bg-white/5"
                      : "text-gray-600 hover:text-gray-400 hover:bg-white/5"
                  }`}
                  title={w.label || w.type}
                >
                  {!w.visible && <EyeOff size={8} className="inline mr-1" />}
                  {w.label || w.type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Properties panel — slide-out on the right */}
        {selectedWidget && (
          <div
            className="absolute top-0 right-0 bottom-0 w-64 bg-black/90 backdrop-blur-xl border-l border-white/5 overflow-y-auto z-30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Properties
                </h3>
                <button
                  onClick={() => setSelectedWidgetId(null)}
                  className="text-gray-600 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div>
                <label className="text-[10px] text-gray-500 uppercase">
                  Type
                </label>
                <p className="text-sm text-white">
                  {selectedWidget.label || selectedWidget.type}
                </p>
              </div>

              {/* Position & Size */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">
                    X
                  </label>
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
                  <label className="text-[10px] text-gray-500 uppercase">
                    Y
                  </label>
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
                  <label className="text-[10px] text-gray-500 uppercase">
                    W
                  </label>
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
                  <label className="text-[10px] text-gray-500 uppercase">
                    H
                  </label>
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

              {/* Opacity */}
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

              {/* Lock & Visibility */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    updateWidget(selectedWidget.id, {
                      locked: !selectedWidget.locked,
                    })
                  }
                  className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                    selectedWidget.locked
                      ? "border-yellow-500/30 text-yellow-400 bg-yellow-500/5"
                      : "border-white/10 text-gray-400 hover:bg-white/5"
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
                  className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                    !selectedWidget.visible
                      ? "border-orange-500/30 text-orange-400 bg-orange-500/5"
                      : "border-white/10 text-gray-400 hover:bg-white/5"
                  }`}
                >
                  {selectedWidget.visible ? (
                    <Eye size={10} />
                  ) : (
                    <EyeOff size={10} />
                  )}
                  {selectedWidget.visible ? "Visible" : "Hidden"}
                </button>
              </div>

              {/* Widget Config */}
              <div className="border-t border-white/5 pt-3">
                <h4 className="text-[10px] text-gray-500 uppercase mb-2">
                  Config
                </h4>
                <WidgetConfigPanel
                  widgetType={selectedWidget.type}
                  config={selectedWidget.config}
                  onConfigChange={(key, value) => {
                    const newConfig = {
                      ...selectedWidget.config,
                      [key]: value,
                    };
                    updateWidget(selectedWidget.id, { config: newConfig });
                  }}
                />
              </div>

              {/* Delete */}
              <button
                onClick={() => deleteWidget(selectedWidget.id)}
                className="w-full flex items-center justify-center gap-1 text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-2 py-2 rounded-lg transition-all mt-4"
              >
                <Trash2 size={12} />
                Delete Widget
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
