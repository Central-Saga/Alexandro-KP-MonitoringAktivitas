"use client";

import { useMemo, useState } from "react";
import { useActivities } from "../../hooks/use-activities";
import { useProjects } from "../../hooks/use-projects";
import type { Activity } from "../../services/activity-service";
import { AdminIcon } from "./admin-icons";
import EmployeeReportTable, { type EmployeeReportRow } from "./employee-report-table";
import ProjectReportTable from "./project-report-table";
import StatCard from "./stat-card";

type ReportTab = "employees" | "projects";
type ReportFilters = { projectId: string; startDate: string; endDate: string };

export default function ReportManagement() {
  const initialRange = useMemo(() => getCurrentMonthRange(), []);
  const activitiesState = useActivities();
  const projectsState = useProjects();
  const activities = activitiesState.data;
  const projects = projectsState.data;
  const [draftFilters, setDraftFilters] = useState<ReportFilters>({
    projectId: "",
    ...initialRange,
  });
  const [activeFilters, setActiveFilters] = useState<ReportFilters>({
    projectId: "",
    ...initialRange,
  });
  const [activeTab, setActiveTab] = useState<ReportTab>("employees");
  const [filterError, setFilterError] = useState("");
  const isLoading = activitiesState.isLoading || projectsState.isLoading;
  const loadError = activitiesState.error ?? projectsState.error;

  const filteredActivities = useMemo(
    () =>
      activities.filter((activity) => {
        const date = activity.activity_date.slice(0, 10);
        const matchesProject =
          !activeFilters.projectId ||
          activity.project_id === Number(activeFilters.projectId);
        return (
          matchesProject &&
          date >= activeFilters.startDate &&
          date <= activeFilters.endDate
        );
      }),
    [activities, activeFilters],
  );

  const employeeRows = useMemo(
    () => aggregateEmployees(filteredActivities),
    [filteredActivities],
  );
  const projectRows = useMemo(
    () =>
      projects
        .filter(
          (project) =>
            !activeFilters.projectId ||
            project.id === Number(activeFilters.projectId),
        )
        .map((project) => ({
          ...project,
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

  return (
    <main className="space-y-6 p-4 sm:p-7">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#172b4d]">Laporan</h2>
          <p className="mt-1 text-sm text-[#71829a] sm:text-base">
            Generate dan unduh laporan aktivitas
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton label="Print" icon="print" />
          <ExportButton label="Excel" icon="download" />
          <ExportButton label="PDF" icon="download" primary />
        </div>
      </header>

      {(loadError || filterError) && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {loadError ? "Data laporan belum dapat dimuat." : filterError}
        </p>
      )}

      <form
        onSubmit={applyFilters}
        className="rounded-2xl border border-[#dce4ec] bg-white p-4 shadow-[0_2px_5px_rgba(15,23,42,0.05)] sm:p-6"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SelectField label="Karyawan" disabled value="">
            <option value="">Semua Karyawan</option>
          </SelectField>
          <SelectField
            label="Proyek"
            value={draftFilters.projectId}
            onChange={(value) =>
              setDraftFilters((current) => ({ ...current, projectId: value }))
            }
          >
            <option value="">Semua Proyek</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </SelectField>
          <DateField
            label="Tanggal Mulai"
            value={draftFilters.startDate}
            onChange={(value) =>
              setDraftFilters((current) => ({ ...current, startDate: value }))
            }
          />
          <DateField
            label="Tanggal Akhir"
            value={draftFilters.endDate}
            onChange={(value) =>
              setDraftFilters((current) => ({ ...current, endDate: value }))
            }
          />
        </div>
        <div className="mt-5 flex justify-end">
          <button
            type="submit"
            disabled={isLoading || Boolean(loadError)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#18a84f] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <AdminIcon name="filter" className="h-5 w-5" />
            Terapkan Filter
          </button>
        </div>
      </form>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Aktivitas" value={isLoading ? "—" : filteredActivities.length} detail="Sesuai filter aktif" icon="project" tone="green" />
        <StatCard title="Total Jam Kerja" value="—" detail="Field waktu belum tersedia" icon="activity" tone="blue" />
        <StatCard title="Rata-rata Produktivitas" value="—" detail="Definisi skor belum tersedia" icon="chart" tone="yellow" />
        <StatCard title="Proyek Selesai" value="—" detail="Status proyek belum terdefinisi" icon="shield" tone="red" />
      </section>

      <div>
        <div className="flex gap-2 overflow-x-auto border-b border-[#dce4ec]">
          <TabButton active={activeTab === "employees"} onClick={() => setActiveTab("employees")}>Laporan Karyawan</TabButton>
          <TabButton active={activeTab === "projects"} onClick={() => setActiveTab("projects")}>Laporan Proyek</TabButton>
        </div>
        <div className="mt-5">
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

function ExportButton({ label, icon, primary = false }: { label: string; icon: "print" | "download"; primary?: boolean }) {
  return (
    <button type="button" disabled title={`Export ${label} belum tersedia`} className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold opacity-60 ${primary ? "border-[#18a84f] bg-[#18a84f] text-white" : "border-[#dce4ec] bg-white text-[#60738f]"}`}>
      <AdminIcon name={icon} className="h-4 w-4" />
      {label}
    </button>
  );
}

function SelectField({ label, value, children, disabled = false, onChange }: { label: string; value: string; children: React.ReactNode; disabled?: boolean; onChange?: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold text-[#172b4d]">
      {label}
      <select disabled={disabled} value={value} onChange={(event) => onChange?.(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#dce4ec] bg-white px-4 font-normal text-[#172b4d] outline-none focus:border-[#18a84f] disabled:cursor-not-allowed disabled:bg-[#f8fafc] disabled:text-[#71829a]">
        {children}
      </select>
    </label>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-semibold text-[#172b4d]">
      {label}
      <input type="date" required value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-[#dce4ec] bg-white px-4 font-normal text-[#172b4d] outline-none focus:border-[#18a84f]" />
    </label>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`shrink-0 border-b-2 px-5 py-3 text-sm font-semibold ${active ? "border-[#18a84f] text-[#18a84f]" : "border-transparent text-[#71829a]"}`}>
      {children}
    </button>
  );
}

function aggregateEmployees(activities: Activity[]): EmployeeReportRow[] {
  const rows = new Map<number, EmployeeReportRow>();
  activities.forEach((activity) => {
    const row = rows.get(activity.user_id) ?? { userId: activity.user_id, total: 0, approved: 0 };
    row.total += 1;
    row.approved += activity.status === "approved" ? 1 : 0;
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
