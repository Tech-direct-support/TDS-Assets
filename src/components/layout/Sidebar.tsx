"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  MapPin,
  Map as MapIcon,
  Radar,
  Bell,
  BarChart3,
  LifeBuoy,
  History,
  Bot,
  Compass,
  Users,
} from "lucide-react";
import type { UserRole } from "@/lib/types/database";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assets", label: "Assets", icon: Boxes },
  { href: "/locations", label: "Locations", icon: MapPin },
  { href: "/map", label: "Map", icon: MapIcon },
  { href: "/geofences", label: "Geofences", icon: Radar },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/helpdesk", label: "Helpdesk", icon: LifeBuoy },
  { href: "/audit", label: "Audit History", icon: History },
  { href: "/assistant", label: "AI Assistant", icon: Bot },
  { href: "/roadmap", label: "Roadmap", icon: Compass },
  { href: "/settings/users", label: "Users", icon: Users, roles: ["admin"] },
];

export function Sidebar({
  role,
  openAlerts,
  forceVisible = false,
}: {
  role: UserRole;
  openAlerts: number;
  forceVisible?: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`${forceVisible ? "flex" : "hidden md:flex"} w-60 flex-col bg-black text-white shrink-0 h-full`}
    >
      <div className="h-14 flex items-center gap-2 px-5 border-b border-white/10">
        <svg width="20" height="24" viewBox="0 0 34 40" aria-hidden>
          <path d="M2 2 H32 V11 H21.5 V38 H12.5 V11 H2 Z" fill="#D6001C" />
        </svg>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-wide">TDS ASSET</div>
          <div className="text-[10px] tracking-[0.2em] text-white/50">INTELLIGENCE</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role)).map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 px-5 py-2.5 text-[13px] font-medium transition-colors ${
                active ? "text-white bg-white/[0.06]" : "text-white/65 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {active && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-red" />}
              <Icon size={16} strokeWidth={2} />
              <span className="flex-1">{item.label}</span>
              {item.href === "/alerts" && openAlerts > 0 && (
                <span className="text-[10px] font-semibold bg-red text-white rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                  {openAlerts}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-3 border-t border-white/10 text-[10px] text-white/40 tracking-wide">
        Tech Direct Support
      </div>
    </aside>
  );
}
