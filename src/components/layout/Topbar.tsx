"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Bell, ChevronDown, LogOut, Menu, X } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { Sidebar } from "./Sidebar";
import type { UserRole } from "@/lib/types/database";

const TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/assets": "Asset Register",
  "/locations": "Locations",
  "/map": "Asset Map",
  "/geofences": "Geofences",
  "/alerts": "Alerts",
  "/reports": "Reports",
  "/helpdesk": "Helpdesk",
  "/audit": "Audit History",
  "/assistant": "AI Asset Assistant",
  "/roadmap": "Roadmap",
  "/settings/users": "Users",
};

function pageTitle(pathname: string) {
  const exact = TITLES[pathname];
  if (exact) return exact;
  const base = "/" + pathname.split("/")[1];
  return TITLES[base] ?? "TDS Asset Intelligence";
}

export function Topbar({
  tenantName,
  fullName,
  role,
  openAlerts,
}: {
  tenantName: string;
  fullName: string;
  role: UserRole;
  openAlerts: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [q, setQ] = useState("");

  return (
    <>
 <header className="h-14 flex items-center gap-4 px-4 md:px-6 bg-white border-b border-line shrink-0">
  <button
    className="md:hidden text-ink"
    onClick={() => setMobileNavOpen(true)}
    aria-label="Open menu"
  >
    <Menu size={20} />
  </button>

  <div className="flex items-baseline gap-2 min-w-0 shrink-0">
    <h1 className="text-[15px] font-semibold text-ink truncate">
      {pageTitle(pathname)}
    </h1>
    <span className="hidden lg:inline text-[12px] text-ink-soft truncate">
      {tenantName}
    </span>
  </div>

  <form
    className="hidden md:flex w-full max-w-sm ml-4"
    onSubmit={(e) => {
      e.preventDefault();
      if (q.trim()) {
        router.push(`/assets?q=${encodeURIComponent(q.trim())}`);
      }
    }}
  >
    <div className="relative w-full">
      <Search
        size={14}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft"
      />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search assets, tags, serial numbers..."
        className="w-full h-8 pl-8 pr-3 text-[13px] border border-line rounded-[3px] bg-surface-muted focus:bg-white focus:outline-none focus:border-black transition-colors"
      />
    </div>
  </form>

  {/* Push notifications + profile to right */}
  <div className="ml-auto flex items-center gap-5 shrink-0">
    <Link
      href="/alerts"
      className="relative text-ink-soft hover:text-black transition-colors"
      aria-label="Alerts"
    >
      <Bell size={18} />

      {openAlerts > 0 && (
        <span className="absolute -top-1.5 -right-1.5 text-[9px] font-semibold bg-red text-white rounded-full min-w-[15px] h-[15px] px-0.5 flex items-center justify-center">
          {openAlerts}
        </span>
      )}
    </Link>

    <div className="relative">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-2 pl-1"
      >
        <span className="w-7 h-7 rounded-full bg-black text-white text-[11px] font-semibold flex items-center justify-center">
          {fullName.slice(0, 2).toUpperCase()}
        </span>

        <span className="hidden sm:flex items-center gap-1 text-[13px] text-ink">
          {fullName}
          <ChevronDown size={13} className="text-ink-soft" />
        </span>
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setMenuOpen(false)}
          />

          <div className="absolute right-0 mt-2 w-48 bg-white border border-line rounded-[3px] shadow-[0_2px_10px_rgba(0,0,0,0.08)] z-20">
            <div className="px-3 py-2.5 border-b border-line">
              <div className="text-[13px] font-medium text-ink">
                {fullName}
              </div>
              <div className="text-[11px] text-ink-soft capitalize">
                {role.replace("_", " ")}
              </div>
            </div>

            <form action={logout}>
              <button
                type="submit"
                className="w-full flex items-center gap-2 px-3 py-2.5 text-[13px] text-ink hover:bg-surface-muted"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  </div>
</header>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex">
            <div className="relative h-full">
              <Sidebar role={role} openAlerts={openAlerts} forceVisible />
              <button
                className="absolute top-4 -right-9 text-white"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
