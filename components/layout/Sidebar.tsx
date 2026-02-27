"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Plus,
  BarChart3,
  Layers,
  CreditCard,
  Settings,
  Shield,
  Lightbulb,
  Swords,
  Users,
  ChevronDown,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useOwner } from "@/lib/owner-context";
import { useState, useRef, useEffect } from "react";

const links = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/hunts", icon: Swords, label: "Hunts" },
  { href: "/hunt/new", icon: Plus, label: "New Hunt" },
  { href: "/stats", icon: BarChart3, label: "Statistics" },
  { href: "/editor", icon: Layers, label: "Overlays" },
  { href: "/billing", icon: CreditCard, label: "Billing" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isMod, owners, selectedOwnerId, setSelectedOwnerId, loading: ownersLoading } = useOwner();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedOwner = owners.find((o) => o.id === selectedOwnerId);

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-56 border-r border-white/5 bg-black/50 backdrop-blur-xl z-40 hidden lg:block">
      <nav className="p-4 space-y-1">
        {/* Streamer Selector for Mods */}
        {isMod && owners.length > 0 && (
          <div className="mb-3" ref={dropdownRef}>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider font-medium px-3 mb-1.5">
              Managing
            </p>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all text-left"
            >
              {selectedOwner?.image && (
                <img
                  src={selectedOwner.image}
                  alt=""
                  className="w-6 h-6 rounded-full flex-shrink-0"
                />
              )}
              <span className="text-sm text-white font-medium truncate flex-1">
                {ownersLoading ? "Loading..." : selectedOwner?.name || "Select streamer"}
              </span>
              <ChevronDown
                size={14}
                className={`text-gray-500 flex-shrink-0 transition-transform ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="mt-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl overflow-hidden">
                {owners.map((owner) => (
                  <button
                    key={owner.id}
                    onClick={() => {
                      setSelectedOwnerId(owner.id);
                      setDropdownOpen(false);
                      // Reload the page to refetch data for new owner
                      window.location.reload();
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                      owner.id === selectedOwnerId
                        ? "bg-red-500/10 text-red-400"
                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {owner.image && (
                      <img
                        src={owner.image}
                        alt=""
                        className="w-5 h-5 rounded-full flex-shrink-0"
                      />
                    )}
                    <span className="text-sm truncate">{owner.name || "Unknown"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {links.map((link) => {
          const active =
            pathname === link.href || pathname.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                active
                  ? "bg-red-500/10 text-red-500 border border-red-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <link.icon size={18} />
              {link.label}
            </Link>
          );
        })}

        {session?.user?.isAdmin && (
          <>
            <div className="section-divider my-3" />
            <Link
              href="/admin/scraper"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                pathname.startsWith("/admin")
                  ? "bg-red-500/10 text-red-500 border border-red-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Shield size={18} />
              Admin
            </Link>
            <Link
              href="/mods"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                pathname.startsWith("/mods")
                  ? "bg-red-500/10 text-red-500 border border-red-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Users size={18} />
              Mods
            </Link>
          </>
        )}

        <div className="section-divider my-3" />
        <a
          href="#"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/5 transition-all"
        >
          <Lightbulb size={18} />
          Request a Feature
        </a>
      </nav>
    </aside>
  );
}
