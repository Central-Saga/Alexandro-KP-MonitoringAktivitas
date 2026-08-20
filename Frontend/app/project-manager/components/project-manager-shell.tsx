"use client";

import { useState, type ReactNode } from "react";
import { useAuth } from "../../components/auth-provider";
import ProjectManagerSidebar from "./project-manager-sidebar";
import ProjectManagerTopbar from "./project-manager-topbar";

export default function ProjectManagerShell({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return <div className="flex h-screen overflow-hidden bg-[#f4f7fa]"><ProjectManagerSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={() => void logout()} /><div className="flex min-w-0 flex-1 flex-col"><ProjectManagerTopbar onOpenMenu={() => setSidebarOpen(true)} /><div className="min-h-0 flex-1 overflow-y-auto">{children}</div></div></div>;
}
