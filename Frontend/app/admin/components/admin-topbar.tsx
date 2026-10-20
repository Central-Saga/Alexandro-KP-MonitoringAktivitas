"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../components/auth-provider";
import { AdminIcon } from "./admin-icons";

const pageTitles: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/users": "Data User",
  "/admin/roles": "Manajemen Role",
  "/admin/divisions": "Data Divisi",
  "/admin/projects": "Manajemen Proyek",
  "/admin/activities": "Monitoring Aktivitas",
  "/admin/reports": "Laporan",
  "/admin/profile": "Profil",
  "/admin/settings": "Pengaturan",
};

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  project_manager: "Project Manager",
  karyawan: "Karyawan",
};

export default function AdminTopbar({
  onOpenMenu,
}: {
  onOpenMenu: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const initials = user?.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "A";

  const roleLabel = user?.role
    ? (roleLabels[user.role] ?? user.role)
    : "Administrator";

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDropdownOpen(false);
      }
    }

    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dropdownOpen]);



  return (
    <header className="flex min-h-[72px] items-center border-b border-[#e0e3dc] bg-[#fbfbf8] px-4 sm:px-7">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Buka menu"
        className="mr-3 rounded-lg border border-[#dce4ec] p-2 text-[#60738f] transition-colors hover:bg-slate-50 lg:hidden"
      >
        <AdminIcon name="menu" className="h-5 w-5" />
      </button>

      <div>
        <h1 className="text-lg font-semibold tracking-tight text-[#20292a] sm:text-xl">
          {pageTitles[pathname] ?? "Administrator"}
        </h1>
        <p className="mt-0.5 hidden text-xs text-[#707b78] sm:block">
          Central Saga Mandala · Monitoring aktivitas
        </p>
      </div>

      {/* User Identity & Profile Dropdown */}
      <div ref={dropdownRef} className="relative ml-auto">
        <button
          type="button"
          onClick={() => setDropdownOpen((prev) => !prev)}
          aria-expanded={dropdownOpen}
          aria-haspopup="menu"
          aria-label="Menu akun pengguna"
          className="flex items-center gap-2.5 rounded-lg border border-transparent p-1.5 transition-colors hover:border-[#e0e3dc] hover:bg-[#f3f4f0] focus:outline-none focus:ring-2 focus:ring-[#285c5e]/20 sm:p-2"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#285c5e] text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="hidden text-left sm:block">
            <p className="max-w-[150px] truncate text-xs font-bold text-[#030303] md:max-w-[180px] md:text-sm">
              {user?.name ?? "Administrator"}
            </p>
            <p className="text-[11px] text-[#5a737e]">{roleLabel}</p>
          </div>
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-4 w-4 text-[#5a737e] transition-transform duration-200 ${
              dropdownOpen ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        {dropdownOpen && (
          <div
            role="menu"
            aria-orientation="vertical"
            className="absolute right-0 top-full z-50 mt-2 w-60 animate-in fade-in zoom-in-95 rounded-xl border border-[#e0e3dc] bg-[#fbfbf8] p-2 shadow-lg ring-1 ring-black/5 duration-100"
          >
            {/* Header Identity in Dropdown */}
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-bold text-[#030303]">
                {user?.name ?? "Administrator"}
              </p>
              {user?.email && (
                <p className="truncate text-xs text-[#5a737e]">{user.email}</p>
              )}
              <div className="mt-1.5">
                <span className="inline-flex rounded-md bg-[#eef1ec] px-2 py-0.5 text-[10px] font-medium text-[#526b62]">
                  {roleLabel}
                </span>
              </div>
            </div>

            <div className="my-1 border-t border-[#e6e8e2]" />

            {/* Menu Items */}
            <Link
              href="/admin/profile"
              role="menuitem"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-[#35403d] transition-colors hover:bg-[#f0f2ed] hover:text-[#426d68]"
            >
              <AdminIcon name="user" className="h-4 w-4 text-[#737d79]" />
              Profil Saya
            </Link>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setDropdownOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#8a5145] transition-colors hover:bg-[#f2e9e6]"
            >
              <AdminIcon name="logout" className="h-4 w-4 text-[#8a5145]" />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
