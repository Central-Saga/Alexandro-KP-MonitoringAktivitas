"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "../../components/auth-provider";
import { AdminIcon } from "../../admin/components/admin-icons";

const titles: Record<string, string> = {
  "/karyawan/dashboard": "Dashboard",
  "/karyawan/tasks": "Tugas Saya",
  "/karyawan/activities": "Daily Activity",
  "/karyawan/profile": "Profil",
};

export default function EmployeeTopbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const initials = user?.name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <header className="flex min-h-[82px] items-center border-b border-[#dce4ec] bg-white px-4 sm:px-7"><button type="button" onClick={onOpenMenu} aria-label="Buka menu" className="mr-3 rounded-lg border border-[#dce4ec] p-2 text-[#60738f] lg:hidden"><AdminIcon name="menu" className="h-5 w-5" /></button><div><h1 className="text-xl font-bold text-[#172b4d] sm:text-2xl">{titles[pathname] ?? "Karyawan"}</h1><p className="mt-0.5 hidden text-sm text-[#71829a] sm:block">Central Saga Mandala</p></div><div className="ml-auto flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#43a956] text-sm font-bold text-white">{initials || "K"}</div><div className="hidden lg:block"><p className="max-w-40 truncate text-sm font-bold text-[#172b4d]">{user?.name ?? "Karyawan"}</p><p className="text-xs text-[#71829a]">Karyawan</p></div></div></header>;
}
