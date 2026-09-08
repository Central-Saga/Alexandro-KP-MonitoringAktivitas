"use client";

import { useState } from "react";
import { useAuth } from "./auth-provider";

type PlaceholderDashboardProps = {
  title: string;
};

export default function PlaceholderDashboard({
  title,
}: PlaceholderDashboardProps) {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
  };

  if (!user) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <section className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#43A956]">
          Placeholder
        </p>
        <h1 className="mt-3 text-3xl font-bold text-[#172B4D]">{title}</h1>
        <p className="mt-4 text-[#60738F]">Selamat datang, {user.name}.</p>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="mt-8 rounded-lg bg-[#43A956] px-6 py-3 font-semibold text-white hover:bg-[#39964B] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isLoggingOut ? "Keluar..." : "Logout"}
        </button>
      </section>
    </main>
  );
}
