"use client";

import { useState, type ReactNode } from "react";
import { useAuth } from "../../components/auth-provider";
import AdminSidebar from "./admin-sidebar";
import AdminTopbar from "./admin-topbar";

export default function AdminShell({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f3f4f0]">
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={() => void logout()}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar onOpenMenu={() => setSidebarOpen(true)} />
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
