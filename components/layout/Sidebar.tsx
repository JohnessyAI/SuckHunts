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
} from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

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

  return (
    <aside className="fixed left-0 top-16 bottom-0 w-56 border-r border-white/5 bg-black/50 backdrop-blur-xl z-40 hidden lg:block">
      <nav className="p-4 space-y-1">
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
