"use client";

import { useState } from "react";
import ProjectAssignments from "../components/project-assignments";
import ProjectTaskManagement from "../components/project-task-management";

export default function ProjectManagerAssignmentsPage() {
  const [tab, setTab] = useState<"members" | "tasks">("members");

  return (
    <main className="space-y-6 p-4 sm:p-7">
      <header>
        <h1 className="text-2xl font-bold text-[#172b4d]">Penugasan Proyek</h1>
        <p className="mt-1 text-sm text-[#71829a]">
          Kelola anggota dan penugasan karyawan pada proyek yang Anda tangani.
        </p>
      </header>

      <div
        className="flex gap-2 border-b border-[#dce4ec]"
        role="tablist"
        aria-label="Jenis penugasan"
      >
        <TabButton
          active={tab === "members"}
          onClick={() => setTab("members")}
        >
          Anggota Proyek
        </TabButton>
        <TabButton active={tab === "tasks"} onClick={() => setTab("tasks")}>
          Tugas Karyawan
        </TabButton>
      </div>

      <div role="tabpanel">
        {tab === "members" ? (
          <ProjectAssignments />
        ) : (
          <ProjectTaskManagement />
        )}
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`border-b-2 px-4 py-3 text-sm transition-colors ${
        active
          ? "border-[#18a84f] font-bold text-[#168c44]"
          : "border-transparent font-medium text-[#71829a] hover:text-[#172b4d]"
      }`}
    >
      {children}
    </button>
  );
}
