"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Users, Plus, Trash2, X, ShieldAlert } from "lucide-react";

interface Mod {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function ModsPage() {
  const { data: session } = useSession();
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.isAdmin) {
      fetch("/api/admin/mods")
        .then((r) => r.json())
        .then(setMods)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session]);

  if (!session?.user?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <ShieldAlert size={48} className="mb-4 text-red-500/50" />
        <p className="text-lg font-medium text-white mb-1">Access Denied</p>
        <p className="text-sm">You need admin privileges to manage mods.</p>
      </div>
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/admin/mods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
    });

    if (res.ok) {
      const mod = await res.json();
      setMods((prev) => [mod, ...prev]);
      setName("");
      setEmail("");
      setPassword("");
      setShowForm(false);
    } else {
      const data = await res.json();
      setError(data.error || "Failed to create mod");
    }

    setSubmitting(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to remove this mod account?")) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/mods/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMods((prev) => prev.filter((m) => m.id !== id));
    }
    setDeleting(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-outfit text-2xl font-bold">Mod Accounts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage moderator accounts. Mods sign in with email &amp; password.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(""); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            showForm
              ? "bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10"
              : "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white hover:scale-105 shadow-lg shadow-red-500/25"
          }`}
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "Add Mod"}
        </button>
      </div>

      {/* Add Mod Form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="glass-card rounded-xl border border-white/5 p-5 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-gray-400" />
            <h2 className="font-outfit font-semibold">New Mod Account</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mod name"
                className="form-input"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mod@example.com"
                className="form-input"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="form-input"
                minLength={8}
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 mb-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !name.trim() || !email.trim() || password.length < 8}
            className="bg-gradient-to-r from-green-600 to-green-500 disabled:from-gray-700 disabled:to-gray-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
          >
            {submitting ? "Creating..." : "Create Mod"}
          </button>
        </form>
      )}

      {/* Mods List */}
      <div className="glass-card rounded-xl border border-white/5">
        <div className="p-5 border-b border-white/5">
          <h2 className="font-outfit text-lg font-semibold">
            {mods.length} Mod{mods.length !== 1 ? "s" : ""}
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : mods.length === 0 ? (
          <div className="p-8 text-center">
            <Users size={32} className="mx-auto mb-3 text-gray-700" />
            <p className="text-gray-500 mb-1">No mods yet</p>
            <p className="text-xs text-gray-600">
              Click &quot;Add Mod&quot; to create the first moderator account.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {mods.map((mod) => (
              <div
                key={mod.id}
                className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-red-400">
                      {mod.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {mod.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{mod.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-xs text-gray-600">
                    {new Date(mod.createdAt).toLocaleDateString()}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400">
                    MOD
                  </span>
                  <button
                    onClick={() => handleDelete(mod.id)}
                    disabled={deleting === mod.id}
                    className="p-1.5 rounded-md hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                    title="Remove mod"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
