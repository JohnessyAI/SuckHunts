"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Layers, Trash2, ExternalLink } from "lucide-react";
import { useOwner } from "@/lib/owner-context";
import { apiFetch } from "@/lib/api-fetch";

interface OverlayProject {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  _count: { scenes: number };
}

export default function EditorListPage() {
  const router = useRouter();
  const { selectedOwnerId } = useOwner();
  const [projects, setProjects] = useState<OverlayProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    apiFetch("/api/overlays", undefined, selectedOwnerId)
      .then((r) => r.json())
      .then(setProjects)
      .finally(() => setLoading(false));
  }, [selectedOwnerId]);

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    const res = await apiFetch("/api/overlays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    }, selectedOwnerId);
    if (res.ok) {
      const project = await res.json();
      router.push(`/editor/${project.id}`);
    }
    setCreating(false);
  };

  const deleteProject = async (id: string) => {
    await apiFetch(`/api/overlays/${id}`, { method: "DELETE" }, selectedOwnerId);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-outfit text-2xl font-bold">Overlay Editor</h1>
          <p className="text-sm text-gray-500 mt-1">
            Build custom OBS overlays with scenes and widgets
          </p>
        </div>
      </div>

      {/* Create New */}
      <form
        onSubmit={createProject}
        className="glass-card rounded-xl p-5 border border-white/5 mb-6 flex items-center gap-3"
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New overlay name..."
          className="form-input flex-1"
        />
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 disabled:from-gray-700 disabled:to-gray-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-105 shadow-lg shadow-red-500/25 flex-shrink-0"
        >
          <Plus size={16} />
          Create
        </button>
      </form>

      {/* Projects List */}
      {loading ? (
        <div className="text-center text-gray-500 py-12">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="glass-card rounded-xl p-12 border border-white/5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Layers className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="font-outfit text-lg font-semibold mb-2">
            No overlays yet
          </h2>
          <p className="text-sm text-gray-500">
            Create your first overlay to start building custom stream layouts.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="glass-card rounded-xl border border-white/5 hover:border-red-500/20 transition-all group"
            >
              <Link href={`/editor/${project.id}`} className="block p-5">
                <h3 className="font-outfit font-semibold text-white group-hover:text-red-400 transition-colors mb-1">
                  {project.name}
                </h3>
                <p className="text-xs text-gray-500">
                  {project._count.scenes} scene
                  {project._count.scenes !== 1 ? "s" : ""} &middot; Updated{" "}
                  {new Date(project.updatedAt).toLocaleDateString()}
                </p>
              </Link>
              <div className="flex items-center gap-1 px-5 pb-4">
                <Link
                  href={`/o/${project.slug}`}
                  target="_blank"
                  className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1"
                >
                  <ExternalLink size={12} />
                  OBS URL
                </Link>
                <button
                  onClick={() => deleteProject(project.id)}
                  className="ml-auto text-gray-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
