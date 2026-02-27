"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface Owner {
  id: string;
  name: string | null;
  image: string | null;
}

interface OwnerContextValue {
  /** The currently selected owner ID (null for non-mods) */
  selectedOwnerId: string | null;
  /** Set the selected owner */
  setSelectedOwnerId: (id: string) => void;
  /** List of owners the mod can manage */
  owners: Owner[];
  /** Whether the current user is a mod */
  isMod: boolean;
  /** Whether owners are still loading */
  loading: boolean;
}

const OwnerContext = createContext<OwnerContextValue>({
  selectedOwnerId: null,
  setSelectedOwnerId: () => {},
  owners: [],
  isMod: false,
  loading: false,
});

const STORAGE_KEY = "bh-selected-owner";

export function OwnerProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [selectedOwnerId, setSelectedOwnerIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isMod = session?.user?.isMod === true && (session?.user?.ownerIds?.length ?? 0) > 0;

  // Fetch owner names when mod logs in
  useEffect(() => {
    if (!isMod) {
      setOwners([]);
      setSelectedOwnerIdState(null);
      return;
    }

    setLoading(true);
    fetch("/api/admin/streamers")
      .then((r) => r.json())
      .then((data: Owner[]) => {
        setOwners(data);
        // Restore from localStorage or default to first
        const stored = localStorage.getItem(STORAGE_KEY);
        const valid = data.find((o) => o.id === stored);
        setSelectedOwnerIdState(valid ? valid.id : data[0]?.id ?? null);
      })
      .finally(() => setLoading(false));
  }, [isMod, session?.user?.ownerIds?.length]);

  const setSelectedOwnerId = useCallback((id: string) => {
    setSelectedOwnerIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  return (
    <OwnerContext.Provider
      value={{ selectedOwnerId, setSelectedOwnerId, owners, isMod, loading }}
    >
      {children}
    </OwnerContext.Provider>
  );
}

export function useOwner() {
  return useContext(OwnerContext);
}
