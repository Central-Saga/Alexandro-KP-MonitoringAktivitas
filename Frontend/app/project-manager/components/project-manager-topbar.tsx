"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "../../components/auth-provider";
import { AdminIcon } from "../../admin/components/admin-icons";

const titles: Record<string, string> = {
  "/project-manager/dashboard": "Dashboard",
  "/project-manager/projects": "Data Proyek",
  "/project-manager/assignments": "Penugasan Proyek",
  "/project-manager/activities": "Validasi Aktivitas",
  "/project-manager/profile": "Profil",
};

export default function ProjectManagerTopbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname(); const { user } = useAuth(); const initials = user?.name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <header className="flex min-h-[82px] items-center border-b border-[#dce4ec] bg-white px-4 sm:px-7"><button type="button" onClick={onOpenMenu} aria-label="Buka menu" className="mr-3 rounded-lg border border-[#dce4ec] p-2 text-[#60738f] lg:hidden"><AdminIcon name="menu" className="h-5 w-5" /></button><div><h1 className="text-xl font-bold text-[#172b4d] sm:text-2xl">{titles[pathname] ?? "Project Manager"}</h1><p className="mt-0.5 hidden text-sm text-[#71829a] sm:block">Central Saga Mandala</p></div><div className="ml-auto flex items-center gap-3"><label className="relative hidden md:block" title="Pencarian global belum tersedia"><AdminIcon name="search" className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#91a0b3]" /><input type="search" disabled aria-label="Pencarian global belum tersedia" placeholder="Pencarian belum tersedia" className="h-11 w-52 rounded-xl border border-[#dce4ec] bg-[#f7f9fb] pl-11 pr-4 text-sm text-[#71829a] disabled:cursor-not-allowed xl:w-60" /></label><button type="button" disabled aria-label="Notifikasi belum tersedia" title="Notifikasi belum tersedia" className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#dce4ec] text-[#91a0b3] disabled:cursor-not-allowed"><AdminIcon name="bell" className="h-5 w-5" /></button><div className="hidden h-10 w-px bg-[#e5eaf0] sm:block" /><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#43a956] text-sm font-bold text-white">{initials || "PM"}</div><div className="hidden lg:block"><p className="max-w-40 truncate text-sm font-bold text-[#172b4d]">{user?.name ?? "Project Manager"}</p><p className="text-xs text-[#71829a]">Project Manager</p></div></div></div></header>;
}
