"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../components/auth-provider";
import { AdminIcon } from "../../admin/components/admin-icons";

const pageTitles: Record<string, string> = {
  "/project-manager/dashboard": "Dashboard",
  "/project-manager/projects": "Data Proyek",
  "/project-manager/assignments": "Penugasan Proyek",
  "/project-manager/activities": "Validasi Aktivitas",
  "/project-manager/profile": "Profil",
};

export default function ProjectManagerTopbar({
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
    : "PM";

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
    <header className="flex min-h-[82px] items-center border-b border-[#dce4ec] bg-white px-4 sm:px-7">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Buka menu"
        className="mr-3 rounded-lg border border-[#dce4ec] p-2 text-[#60738f] transition-colors hover:bg-slate-50 lg:hidden"
      >
        <AdminIcon name="menu" className="h-5 w-5" />
      </button>

      <div>
        <h1 className="text-xl font-bold text-[#030303] sm:text-2xl">
          {pageTitles[pathname] ?? "Project Manager"}
        </h1>
        <p className="mt-0.5 hidden text-sm text-[#5a737e] sm:block">
          Central Saga Mandala
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
          className="flex items-center gap-2.5 rounded-xl border border-transparent p-1.5 transition-colors hover:border-[#d0e6ed] hover:bg-[#EAF7FB]/60 focus:outline-none focus:ring-2 focus:ring-[#016273]/20 sm:p-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#016273] text-sm font-bold text-white shadow-sm ring-2 ring-[#EAF7FB]">
            {initials}
          </div>
          <div className="hidden text-left sm:block">
            <p className="max-w-[150px] truncate text-xs font-bold text-[#030303] md:max-w-[180px] md:text-sm">
              {user?.name ?? "Project Manager"}
            </p>
            <p className="text-[11px] text-[#5a737e]">Project Manager</p>
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
            className="absolute right-0 top-full mt-2 w-60 rounded-2xl border border-[#d0e6ed] bg-white p-2 shadow-lg ring-1 ring-black/5 z-50 animate-in fade-in zoom-in-95 duration-100"
          >
            {/* Header Identity in Dropdown */}
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-bold text-[#030303]">
                {user?.name ?? "Project Manager"}
              </p>
              {user?.email && (
                <p className="truncate text-xs text-[#5a737e]">{user.email}</p>
              )}
              <div className="mt-1.5">
                <span className="inline-flex rounded-full bg-[#EAF7FB] px-2.5 py-0.5 text-[10px] font-semibold text-[#016273] ring-1 ring-inset ring-[#016273]/20">
                  Project Manager
                </span>
              </div>
            </div>

            <div className="my-1 border-t border-[#e1e7ee]" />

            {/* Menu Items */}
            <Link
              href="/project-manager/profile"
              role="menuitem"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#030303] transition-colors hover:bg-[#EAF7FB] hover:text-[#016273]"
            >
              <AdminIcon name="user" className="h-4 w-4 text-[#5a737e]" />
              Profil Saya
            </Link>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setDropdownOpen(false);
                logout();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
            >
              <AdminIcon name="logout" className="h-4 w-4 text-rose-500" />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
