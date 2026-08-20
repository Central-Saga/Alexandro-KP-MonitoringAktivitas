"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminIcon, type AdminIconName } from "../../admin/components/admin-icons";

const navigation: Array<{ href: string; label: string; icon: AdminIconName }> = [
  { href: "/project-manager/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/project-manager/projects", label: "Data Proyek", icon: "project" },
  { href: "/project-manager/assignments", label: "Penugasan Proyek", icon: "users" },
  { href: "/project-manager/activities", label: "Validasi Aktivitas", icon: "shield" },
  { href: "/project-manager/profile", label: "Profil", icon: "user" },
];

export default function ProjectManagerSidebar({ isOpen, onClose, onLogout }: { isOpen: boolean; onClose: () => void; onLogout: () => void }) {
  const pathname = usePathname();
  return <><>{isOpen && <button type="button" aria-label="Tutup menu" onClick={onClose} className="fixed inset-0 z-40 bg-slate-950/45 lg:hidden" />}</><aside className={`fixed inset-y-0 left-0 z-50 flex w-[286px] flex-col bg-[#205a35] text-white transition-transform duration-200 lg:static lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}><div className="flex h-[82px] items-center border-b border-white/10 px-6"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#43a956]"><AdminIcon name="shield" className="h-6 w-6" /></div><div className="ml-3"><p className="text-lg font-bold leading-tight">WorkTrack</p><p className="text-xs text-white/65">Monitoring System</p></div><button type="button" onClick={onClose} aria-label="Tutup sidebar" className="ml-auto rounded-lg p-2 text-white/70 lg:hidden"><AdminIcon name="x" className="h-5 w-5" /></button></div><div className="mx-5 mt-4 rounded-xl bg-white/10 px-4 py-3"><p className="text-xs text-white/60">Role Aktif</p><p className="mt-1 text-sm font-bold">Project Manager</p></div><nav className="mt-6 space-y-1 px-3">{navigation.map((item) => { const active = pathname === item.href; return <Link key={item.href} href={item.href} onClick={onClose} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] transition ${active ? "bg-[#43a956] font-semibold text-white" : "text-white/75 hover:bg-white/10 hover:text-white"}`}><AdminIcon name={item.icon} className="h-5 w-5" />{item.label}</Link>; })}</nav><div className="mt-auto border-t border-white/10 px-3 py-5"><button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[15px] text-white/75 hover:bg-white/10 hover:text-white"><AdminIcon name="logout" className="h-5 w-5" />Logout</button></div></aside></>;
}
