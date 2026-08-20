"use client";

import { useState, type ReactNode } from "react";
import { useAuth } from "../../components/auth-provider";
import EmployeeSidebar from "./employee-sidebar";
import EmployeeTopbar from "./employee-topbar";

export default function EmployeeShell({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f7fa]">
      <EmployeeSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={() => void logout()} />
      <div className="flex min-w-0 flex-1 flex-col">
        <EmployeeTopbar onOpenMenu={() => setSidebarOpen(true)} />
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
