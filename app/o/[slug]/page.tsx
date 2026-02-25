"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import WidgetRenderer from "@/components/overlay-renderer/WidgetRenderer";

interface Widget {
  id: string;
  type: string;
  config: Record<string, unknown>;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  visible: boolean;
  opacity: number;
}

interface Scene {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  widgets: Widget[];
}

interface Project {
  id: string;
  slug: string;
  activeSceneId: string | null;
  activeHuntId: string | null;
  scenes: Scene[];
}

interface HuntData {
  title: string;
  status: string;
  totalCost: string;
  totalWon: string;
  entries: Array<{
    id: string;
    gameName: string;
    gameImage: string | null;
    gameProvider: string | null;
    betSize: string;
    cost: string;
    result: string | null;
    multiplier: string | null;
    status: string;
  }>;
}

export default function ObsOverlayPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [project, setProject] = useState<Project | null>(null);
  const [huntData, setHuntData] = useState<HuntData | null>(null);

  // Fetch overlay project data
  useEffect(() => {
    const fetchOverlay = () => {
      fetch(`/api/overlays/${slug}/public`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            setProject(data);
            // Fetch hunt data if linked
            if (data.activeHuntId) {
              fetch(`/api/hunts/${data.activeHuntId}/public`)
                .then((r) => (r.ok ? r.json() : null))
                .then(setHuntData);
            }
          }
        });
    };

    fetchOverlay();
    // Poll for updates
    const interval = setInterval(fetchOverlay, 3000);
    return () => clearInterval(interval);
  }, [slug]);

  if (!project) {
    return (
      <div
        style={{
          width: "100vw",
          height: "100vh",
          background: "transparent",
        }}
      />
    );
  }

  const activeScene = project.scenes.find(
    (s) => s.id === project.activeSceneId
  ) ?? project.scenes[0];

  if (!activeScene) return null;

  return (
    <div
      style={{
        width: activeScene.width,
        height: activeScene.height,
        position: "relative",
        background:
          activeScene.background === "transparent"
            ? "transparent"
            : activeScene.background,
        overflow: "hidden",
      }}
    >
      {activeScene.widgets
        .filter((w) => w.visible)
        .map((widget) => (
          <div
            key={widget.id}
            style={{
              position: "absolute",
              left: widget.x,
              top: widget.y,
              width: widget.width,
              height: widget.height,
              opacity: widget.opacity,
              zIndex: widget.zIndex,
              transform: widget.rotation
                ? `rotate(${widget.rotation}deg)`
                : undefined,
              overflow: "hidden",
            }}
          >
            <WidgetRenderer
              type={widget.type}
              config={widget.config}
              width={widget.width}
              height={widget.height}
              huntData={huntData}
            />
          </div>
        ))}
    </div>
  );
}
