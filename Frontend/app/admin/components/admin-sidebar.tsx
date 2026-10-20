"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "../../components/brand-logo";
import { AdminIcon, type AdminIconName } from "./admin-icons";

const navigation: Array<{ href: string; label: string; icon: AdminIconName }> = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/users", label: "Data User", icon: "users" },
  { href: "/admin/roles", label: "Manajemen Role", icon: "shield" },
  { href: "/admin/divisions", label: "Data Divisi", icon: "building" },
  { href: "/admin/projects", label: "Manajemen Proyek", icon: "project" },
  { href: "/admin/activities", label: "Monitoring Aktivitas", icon: "chart" },
  { href: "/admin/reports", label: "Laporan", icon: "activity" },
];

type AdminSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
};

export default function AdminSidebar({
  isOpen,
  onClose,
  onLogout,
}: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs transition-opacity lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[264px] flex-col bg-[#202d2e] text-white transition-transform duration-300 ease-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-[72px] items-center justify-between border-b border-white/10 px-5">
          <BrandLogo size="md" textVariant="sidebar" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup sidebar"
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <AdminIcon name="x" className="h-5 w-5" />
          </button>
        </div>

        {/* Active Role Card */}
        <div className="mx-4 mt-5 flex items-center justify-between border-b border-white/10 px-2 pb-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#b6c3be]">
              Role Aktif
            </p>
            <p className="mt-1 truncate text-sm font-medium text-white">
              Administrator
            </p>
          </div>
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#7fae98]" />
          </span>
        </div>

        {/* Navigation List */}
        <nav className="mt-5 space-y-1 px-3 pb-4">
          {navigation.map((item) => {
            const active = pathname === item.href;

            if (active) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="group relative flex h-11 items-center gap-3 rounded-lg border-l-[3px] border-[#b7924d] bg-white/[0.09] px-2.5 text-white transition-colors duration-150"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center text-[#d2b36e]">
                    <AdminIcon name={item.icon} className="h-[17px] w-[17px]" />
                  </div>
                  <span className="truncate text-[13px] font-semibold text-white">
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="group flex h-10 items-center gap-3 rounded-lg border-l-[3px] border-transparent px-2.5 text-[13px] font-medium text-white/65 transition-colors duration-150 hover:bg-white/[0.06] hover:text-white"
              >
                {/* Standard Icon Container for alignment */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                  <AdminIcon
                    name={item.icon}
                    className="h-[17px] w-[17px] text-white/50 transition-colors group-hover:text-[#d2b36e]"
                  />
                </div>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section: Settings & Logout */}
        <div className="mt-auto border-t border-white/10 px-3 py-3.5 space-y-1">
          <Link
            href="/admin/settings"
            onClick={onClose}
            className={`group flex items-center gap-3 rounded-lg border-l-[3px] border-transparent px-2.5 py-2.5 text-[13px] transition-colors duration-150 ${
              pathname === "/admin/settings"
                ? "border-[#b7924d] bg-white/[0.09] font-semibold text-white"
                : "font-medium text-white/65 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center">
              <AdminIcon
                name="settings"
                className={`h-4 w-4 transition-colors ${
                  pathname === "/admin/settings"
                    ? "text-[#d2b36e]"
                    : "text-white/60 group-hover:text-white"
                }`}
              />
            </div>
            <span>Pengaturan</span>
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-white/65 transition-all duration-150 hover:bg-rose-500/15 hover:text-rose-200"
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center">
              <AdminIcon
                name="logout"
                className="h-4 w-4 text-white/55 transition-colors group-hover:text-rose-300"
              />
            </div>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
