"use client";

import { useEffect, useMemo, useState } from "react";
import { useActivities } from "../../hooks/use-activities";
import { useProjects } from "../../hooks/use-projects";
import type { Activity } from "../../services/activity-service";
import { getUsers, type ManagedUser } from "../../services/user-service";
import { AdminIcon } from "./admin-icons";
import EmployeeReportTable, {
  type EmployeeReportRow,
} from "./employee-report-table";
import ProjectReportTable, {
  type ProjectReportRow,
} from "./project-report-table";
import StatCard from "./stat-card";

type ReportTab = "employees" | "projects";
type ReportFilters = {
  userId: string;
  projectId: string;
  startDate: string;
  endDate: string;
};

export default function ReportManagement() {
  const initialRange = useMemo(() => getCurrentMonthRange(), []);
  const activitiesState = useActivities({ perPage: 100 });
  const projectsState = useProjects();
  const [employees, setEmployees] = useState<ManagedUser[]>([]);

  const activities = activitiesState.data;
  const projects = projectsState.data;

  const [draftFilters, setDraftFilters] = useState<ReportFilters>({
    userId: "",
    projectId: "",
    ...initialRange,
  });
  const [activeFilters, setActiveFilters] = useState<ReportFilters>({
    userId: "",
    projectId: "",
    ...initialRange,
  });
  const [activeTab, setActiveTab] = useState<ReportTab>("employees");
  const [filterError, setFilterError] = useState("");

  useEffect(() => {
    let active = true;
    void getUsers({ role: "karyawan", status: "active", page: 1, perPage: 100 })
      .then((response) => {
        if (active) setEmployees(response.data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const isLoading = activitiesState.isLoading || projectsState.isLoading;
  const loadError = activitiesState.error ?? projectsState.error;

  const filteredActivities = useMemo(
    () =>
      activities.filter((activity) => {
        const date = activity.activity_date.slice(0, 10);
        const matchesUser =
          !activeFilters.userId ||
          activity.user_id === Number(activeFilters.userId);
        const matchesProject =
          !activeFilters.projectId ||
          activity.project_id === Number(activeFilters.projectId);
        return (
          matchesUser &&
          matchesProject &&
          date >= activeFilters.startDate &&
          date <= activeFilters.endDate
        );
      }),
    [activities, activeFilters],
  );

  const awaitingCount = useMemo(
    () =>
      filteredActivities.filter(
        (a) => a.status === "selesai" || a.status === "pending",
      ).length,
    [filteredActivities],
  );

  const approvedCount = useMemo(
    () => filteredActivities.filter((a) => a.status === "approved").length,
    [filteredActivities],
  );

  const revisionCount = useMemo(
    () => filteredActivities.filter((a) => a.status === "rejected").length,
    [filteredActivities],
  );

  const employeeRows = useMemo(
    () => aggregateEmployees(filteredActivities),
    [filteredActivities],
  );

  const projectRows: ProjectReportRow[] = useMemo(
    () =>
      projects
        .filter(
          (project) =>
            !activeFilters.projectId ||
            project.id === Number(activeFilters.projectId),
        )
        .map((project) => ({
          id: project.id,
          name: project.name,
          client_name: project.client_name || "—",
          project_manager_name: project.project_manager?.name ?? "—",
          start_date: project.start_date,
          end_date: project.end_date,
          status: project.status,
          activityCount: filteredActivities.filter(
            (activity) => activity.project_id === project.id,
          ).length,
        })),
    [activeFilters.projectId, filteredActivities, projects],
  );

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draftFilters.startDate > draftFilters.endDate) {
      setFilterError("Tanggal mulai tidak boleh melebihi tanggal akhir.");
      return;
    }
    setFilterError("");
    setActiveFilters(draftFilters);
  }

  function resetFilters() {
    setFilterError("");
    const resetValues: ReportFilters = {
      userId: "",
      projectId: "",
      ...initialRange,
    };
    setDraftFilters(resetValues);
    setActiveFilters(resetValues);
  }

  const hasFilterChanges = Boolean(
    activeFilters.userId ||
      activeFilters.projectId ||
      activeFilters.startDate !== initialRange.startDate ||
      activeFilters.endDate !== initialRange.endDate,
  );

  return (
    <main className="space-y-4 p-4 sm:space-y-5 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#172b4d] sm:text-2xl">Laporan</h2>
          <p className="text-xs text-[#71829a] sm:text-sm">
            Ringkasan dan laporan aktivitas karyawan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton label="Print" icon="print" />
          <ExportButton label="Excel" icon="download" />
          <ExportButton label="PDF" icon="download" primary />
        </div>
      </header>

      {Boolean(loadError) && (
        <p
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800"
        >
          Data laporan belum dapat dimuat dari server.
        </p>
      )}

      {/* Filter Form */}
      <form
        onSubmit={applyFilters}
        className="rounded-2xl border border-[#dce4ec] bg-white p-4 shadow-[0_2px_5px_rgba(15,23,42,0.05)] sm:p-5"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs font-semibold text-[#172b4d]">
            Karyawan
            <select
              value={draftFilters.userId}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  userId: event.target.value,
                }))
              }
              aria-label="Filter karyawan"
              className="mt-1.5 h-10 w-full rounded-xl border border-[#dce4ec] bg-white px-3 text-xs font-normal text-[#172b4d] outline-none focus:border-[#43a956] focus:ring-2 focus:ring-[#43a956]/20"
            >
              <option value="">Semua Karyawan</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                  {employee.division ? ` (${employee.division.name})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-[#172b4d]">
            Proyek
            <select
              value={draftFilters.projectId}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  projectId: event.target.value,
                }))
              }
              aria-label="Filter proyek"
              className="mt-1.5 h-10 w-full rounded-xl border border-[#dce4ec] bg-white px-3 text-xs font-normal text-[#172b4d] outline-none focus:border-[#43a956] focus:ring-2 focus:ring-[#43a956]/20"
            >
              <option value="">Semua Proyek</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-[#172b4d]">
            Tanggal Mulai
            <input
              type="date"
              required
              value={draftFilters.startDate}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  startDate: event.target.value,
                }))
              }
              aria-label="Tanggal mulai laporan"
              className="mt-1.5 h-10 w-full rounded-xl border border-[#dce4ec] bg-white px-3 text-xs font-normal text-[#172b4d] outline-none focus:border-[#43a956] focus:ring-2 focus:ring-[#43a956]/20"
            />
          </label>

          <label className="block text-xs font-semibold text-[#172b4d]">
            Tanggal Akhir
            <input
              type="date"
              required
              value={draftFilters.endDate}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  endDate: event.target.value,
                }))
              }
              aria-label="Tanggal akhir laporan"
              className="mt-1.5 h-10 w-full rounded-xl border border-[#dce4ec] bg-white px-3 text-xs font-normal text-[#172b4d] outline-none focus:border-[#43a956] focus:ring-2 focus:ring-[#43a956]/20"
            />
          </label>
        </div>

        {filterError && (
          <p role="alert" className="mt-2.5 text-xs text-red-600">
            {filterError}
          </p>
        )}

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-[#e1e7ee] pt-3">
          {hasFilterChanges && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-[#dce4ec] bg-white px-3.5 text-xs font-semibold text-[#60738f] hover:bg-slate-50"
            >
              Reset Filter
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || Boolean(loadError)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#43a956] px-4 text-xs font-semibold text-white shadow-sm hover:bg-[#18a84f] focus:outline-none focus:ring-2 focus:ring-[#43a956]/30 disabled:opacity-60"
          >
            <AdminIcon name="filter" className="h-4 w-4" />
            Terapkan Filter
          </button>
        </div>
      </form>

      {/* 4 Operational KPI Cards */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard
          title="Total Aktivitas"
          value={isLoading ? "—" : filteredActivities.length}
          detail="Aktivitas sesuai filter aktif"
          icon="chart"
          tone="blue"
        />
        <StatCard
          title="Menunggu Validasi"
          value={isLoading ? "—" : awaitingCount}
          detail="Perlu ditinjau reviewer"
          icon="activity"
          tone="yellow"
        />
        <StatCard
          title="Disetujui"
          value={isLoading ? "—" : approvedCount}
          detail="Aktivitas tervalidasi"
          icon="user-check"
          tone="green"
        />
        <StatCard
          title="Perlu Revisi"
          value={isLoading ? "—" : revisionCount}
          detail="Menunggu perbaikan karyawan"
          icon="user-minus"
          tone="red"
        />
      </section>

      {/* Report Tabs */}
      <div>
        <div className="flex gap-1 overflow-x-auto border-b border-[#dce4ec]">
          <TabButton
            active={activeTab === "employees"}
            onClick={() => setActiveTab("employees")}
          >
            Laporan Karyawan
          </TabButton>
          <TabButton
            active={activeTab === "projects"}
            onClick={() => setActiveTab("projects")}
          >
            Laporan Proyek
          </TabButton>
        </div>
        <div className="mt-4">
          {activeTab === "employees" ? (
            <EmployeeReportTable rows={employeeRows} />
          ) : (
            <ProjectReportTable rows={projectRows} />
          )}
        </div>
      </div>
    </main>
  );
}

function ExportButton({
  label,
  icon,
  primary = false,
}: {
  label: string;
  icon: "print" | "download";
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      disabled
      title={`Export ${label} belum tersedia`}
      className={`inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold opacity-60 ${
        primary
          ? "border-[#43a956] bg-[#43a956] text-white"
          : "border-[#dce4ec] bg-white text-[#60738f]"
      }`}
    >
      <AdminIcon name={icon} className="h-3.5 w-3.5" />
      {label}
    </button>
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
      onClick={onClick}
      className={`shrink-0 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors ${
        active
          ? "border-[#43a956] text-[#2f9e44]"
          : "border-transparent text-[#71829a] hover:text-[#172b4d]"
      }`}
    >
      {children}
    </button>
  );
}

function aggregateEmployees(activities: Activity[]): EmployeeReportRow[] {
  const rows = new Map<number, EmployeeReportRow>();
  activities.forEach((activity) => {
    const row = rows.get(activity.user_id) ?? {
      userId: activity.user_id,
      name: activity.user?.name ?? `User #${activity.user_id}`,
      division: activity.user?.division?.name ?? "—",
      total: 0,
      awaitingValidation: 0,
      approved: 0,
      needsRevision: 0,
    };
    row.total += 1;
    if (activity.status === "approved") {
      row.approved += 1;
    } else if (activity.status === "rejected") {
      row.needsRevision += 1;
    } else if (activity.status === "selesai" || activity.status === "pending") {
      row.awaitingValidation += 1;
    }
    rows.set(activity.user_id, row);
  });
  return Array.from(rows.values()).sort((left, right) => right.total - left.total);
}

function getCurrentMonthRange() {
  const now = new Date();
  return {
    startDate: localDateKey(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: localDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
