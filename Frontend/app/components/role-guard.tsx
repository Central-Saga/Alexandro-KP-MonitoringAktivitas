"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-provider";
import { DASHBOARD_BY_ROLE, type UserRole } from "../lib/auth";

type RoleGuardProps = {
  allowedRole: UserRole;
  children: ReactNode;
};

export default function RoleGuard({ allowedRole, children }: RoleGuardProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isAuthenticated || !user) {
      router.replace("/");
      return;
    }

    if (user.role !== allowedRole) {
      router.replace(DASHBOARD_BY_ROLE[user.role]);
    }
  }, [allowedRole, isAuthenticated, isLoading, router, user]);

  if (isLoading || !isAuthenticated || !user || user.role !== allowedRole) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-[#60738F]">Memeriksa sesi...</p>
      </main>
    );
  }

  return children;
}
