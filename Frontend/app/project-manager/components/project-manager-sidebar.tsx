"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "../../components/brand-logo";
import { AdminIcon, type AdminIconName } from "../../admin/components/admin-icons";

const navigation: Array<{ href: string; label: string; icon: AdminIconName }> = [
  { href: "/project-manager/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/project-manager/projects", label: "Data Proyek", icon: "project" },
  { href: "/project-manager/assignments", label: "Penugasan Proyek", icon: "users" },
  { href: "/project-manager/activities", label: "Validasi Aktivitas", icon: "chart" },
];

type ProjectManagerSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
};

export default function ProjectManagerSidebar({
  isOpen,
  onClose,
  onLogout,
}: ProjectManagerSidebarProps) {
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
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-[#016273] text-white shadow-2xl transition-transform duration-300 ease-out lg:static lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-[76px] items-center justify-between border-b border-white/10 px-5">
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
        <div className="mx-4 mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.07] px-3.5 py-2.5 backdrop-blur-sm">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#E1F25F]/90">
              Role Aktif
            </p>
            <p className="truncate text-xs font-bold tracking-wide text-white">
              Project Manager
            </p>
          </div>
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E1F25F] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#E1F25F]" />
          </span>
        </div>

        {/* Navigation List */}
        <nav className="mt-6 space-y-1.5 px-3 pb-4">
          {navigation.map((item) => {
            const active = pathname === item.href;

            if (active) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="group relative flex h-[50px] items-center gap-3 rounded-2xl bg-[#004f5d] px-2.5 text-white shadow-[0_4px_16px_rgba(225,242,95,0.18)] ring-1 ring-[#E1F25F]/35 transition-all duration-200"
                >
                  {/* Floating Icon Bubble */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E1F25F] text-[#016273] shadow-sm ring-2 ring-[#E1F25F]/40 transition-transform duration-200 group-hover:scale-105">
                    <AdminIcon name={item.icon} className="h-4 w-4 stroke-[2.2]" />
                  </div>
                  <span className="truncate text-[14px] font-bold tracking-wide text-white">
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
                className="group flex h-[42px] items-center gap-3 rounded-xl px-2.5 text-[13.5px] font-medium text-white/70 transition-all duration-150 hover:bg-white/[0.08] hover:text-white"
              >
                {/* Standard Icon Container for alignment */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                  <AdminIcon
                    name={item.icon}
                    className="h-[18px] w-[18px] text-white/60 transition-colors group-hover:text-white"
                  />
                </div>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section: Logout */}
        <div className="mt-auto border-t border-white/10 px-3 py-3.5 space-y-1">
          <button
            type="button"
            onClick={onLogout}
            className="group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[13px] font-medium text-white/65 transition-all duration-150 hover:bg-rose-500/15 hover:text-rose-200"
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
