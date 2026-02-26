"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import WidgetRenderer, { type CurrentGameData } from "@/components/overlay-renderer/WidgetRenderer";

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
  const [currentGameData, setCurrentGameData] = useState<CurrentGameData | null>(null);

  // Force transparent background on html/body for OBS
  // Override root layout's bg-black, globals.css body styles, and noise grain overlay
  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    document.body.style.overflow = "hidden";
    document.body.style.margin = "0";
    document.body.style.padding = "0";

    // Kill the noise grain body::after pseudo-element (can't target with inline styles)
    const style = document.createElement("style");
    style.id = "obs-overlay-overrides";
    style.textContent = `
      body::after { display: none !important; }
      html, body { background: transparent !important; }
    `;
    document.head.appendChild(style);

    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
      document.body.style.overflow = "";
      document.body.style.margin = "";
      document.body.style.padding = "";
      style.remove();
    };
  }, []);

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

              // Fetch enriched current game data
              fetch(`/api/hunts/${data.activeHuntId}/current-game`)
                .then((r) => (r.ok ? r.json() : null))
                .then(setCurrentGameData);
            }
          }
        });
    };

    fetchOverlay();
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
              currentGameData={currentGameData}
            />
          </div>
        ))}
    </div>
  );
}
