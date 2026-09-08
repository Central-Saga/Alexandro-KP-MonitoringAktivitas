"use client";

import { useEffect, useMemo, useState } from "react";
import { useProjects } from "../../hooks/use-projects";
import {
  exportReportToExcel,
  exportReportToPdf,
} from "../../lib/report-export";
import { getAllActivities, type Activity } from "../../services/activity-service";
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
  const [employees, setEmployees] = useState<ManagedUser[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [activitiesError, setActivitiesError] = useState<unknown | null>(null);

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

  const [exportingType, setExportingType] = useState<
    "print" | "excel" | "pdf" | null
  >(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const projectsState = useProjects();
  const projects = projectsState.data;

  useEffect(() => {
    let active = true;

    async function loadActivities() {
      setActivitiesLoading(true);
      setActivitiesError(null);
      try {
        const data = await getAllActivities({
          userId: activeFilters.userId ? Number(activeFilters.userId) : undefined,
          projectId: activeFilters.projectId
            ? Number(activeFilters.projectId)
            : undefined,
          dateFrom: activeFilters.startDate || undefined,
          dateTo: activeFilters.endDate || undefined,
        });
        if (active) {
          setActivities(data);
        }
      } catch (err: unknown) {
        if (active) {
          setActivitiesError(err);
        }
      } finally {
        if (active) {
          setActivitiesLoading(false);
        }
      }
    }

    void loadActivities();

    return () => {
      active = false;
    };
  }, [activeFilters]);

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

  const isLoading = activitiesLoading || projectsState.isLoading;
  const loadError = activitiesError ?? projectsState.error;

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
        const matchesDate =
          (!activeFilters.startDate || date >= activeFilters.startDate) &&
          (!activeFilters.endDate || date <= activeFilters.endDate);
        return matchesUser && matchesProject && matchesDate;
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

  const selectedEmployeeName = useMemo(() => {
    if (!activeFilters.userId) return "Semua Karyawan";
    const emp = employees.find((e) => String(e.id) === activeFilters.userId);
    return emp
      ? `${emp.name}${emp.division ? ` (${emp.division.name})` : ""}`
      : `User #${activeFilters.userId}`;
  }, [activeFilters.userId, employees]);

  const selectedProjectName = useMemo(() => {
    if (!activeFilters.projectId) return "Semua Proyek";
    const proj = projects.find((p) => String(p.id) === activeFilters.projectId);
    return proj ? proj.name : `Project #${activeFilters.projectId}`;
  }, [activeFilters.projectId, projects]);

  const isExportDisabled =
    isLoading || Boolean(loadError) || exportingType !== null;

  function handleStartDateChange(value: string) {
    setDraftFilters((current) => {
      const next = { ...current, startDate: value };
      if (next.endDate && value > next.endDate) {
        setFilterError("Tanggal mulai tidak boleh melebihi tanggal akhir.");
      } else {
        setFilterError("");
      }
      return next;
    });
  }

  function handleEndDateChange(value: string) {
    setDraftFilters((current) => {
      const next = { ...current, endDate: value };
      if (next.startDate && next.startDate > value) {
        setFilterError("Tanggal mulai tidak boleh melebihi tanggal akhir.");
      } else {
        setFilterError("");
      }
      return next;
    });
  }

  function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      draftFilters.startDate &&
      draftFilters.endDate &&
      draftFilters.startDate > draftFilters.endDate
    ) {
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

  function handlePrint() {
    if (isExportDisabled) return;
    setExportError(null);
    try {
      window.print();
    } catch (err: unknown) {
      setExportError(
        "Gagal membuka dialog cetak: " +
          (err instanceof Error ? err.message : "Terjadi kesalahan"),
      );
    }
  }

  async function handleExportExcel() {
    if (isExportDisabled) return;
    setExportError(null);
    setExportingType("excel");
    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      exportReportToExcel({
        type: activeTab,
        employeeRows,
        projectRows,
        startDate: activeFilters.startDate,
        endDate: activeFilters.endDate,
      });
    } catch (err: unknown) {
      setExportError(
        "Gagal mengekspor data ke Excel: " +
          (err instanceof Error ? err.message : "Terjadi kesalahan"),
      );
    } finally {
      setExportingType(null);
    }
  }

  async function handleExportPdf() {
    if (isExportDisabled) return;
    setExportError(null);
    setExportingType("pdf");
    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      exportReportToPdf({
        type: activeTab,
        employeeRows,
        projectRows,
        filters: {
          employeeName: activeFilters.userId ? selectedEmployeeName : undefined,
          projectName: activeFilters.projectId ? selectedProjectName : undefined,
          startDate: activeFilters.startDate,
          endDate: activeFilters.endDate,
        },
        kpi: {
          totalActivities: filteredActivities.length,
          awaitingValidation: awaitingCount,
          approved: approvedCount,
          needsRevision: revisionCount,
        },
      });
    } catch (err: unknown) {
      setExportError(
        "Gagal mengekspor data ke PDF: " +
          (err instanceof Error ? err.message : "Terjadi kesalahan"),
      );
    } finally {
      setExportingType(null);
    }
  }

  const hasFilterChanges = Boolean(
    draftFilters.userId ||
      draftFilters.projectId ||
      draftFilters.startDate !== initialRange.startDate ||
      draftFilters.endDate !== initialRange.endDate ||
      activeFilters.userId ||
      activeFilters.projectId ||
      activeFilters.startDate !== initialRange.startDate ||
          activeFilters.endDate !== initialRange.endDate,
  );

  return (
    <main className="space-y-4 p-4 sm:space-y-4 sm:p-5 lg:p-6">
      {/* Print-only Report Header */}
      <header className="print-report-header mb-5 hidden rounded-xl border border-[#d0e6ed] bg-white p-4 print:block">
        <div className="flex items-center justify-between border-b border-[#d0e6ed] pb-3">
          <div>
            <h1 className="text-xl font-bold text-[#030303]">
              Laporan Monitoring Aktivitas Karyawan
            </h1>
            <p className="text-xs text-[#5a737e]">
              Central Saga Mandala • WorkTrack System
            </p>
          </div>
          <div className="text-right text-xs text-[#5a737e]">
            <p className="font-semibold text-[#030303]">Administrator</p>
            <p>{formatDateTimeDisplay(new Date())}</p>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-4 text-xs text-[#5a737e]">
          <div>
            <span className="font-semibold text-[#030303]">Periode: </span>
            <span className="text-[#5a737e]">
              {formatDateRange(activeFilters.startDate, activeFilters.endDate)}
            </span>
          </div>
          {selectedEmployeeName && (
            <div>
              <span className="font-semibold text-[#030303]">Karyawan: </span>
              <span className="text-[#5a737e]">{selectedEmployeeName}</span>
            </div>
          )}
          {selectedProjectName && (
            <div>
              <span className="font-semibold text-[#030303]">Proyek: </span>
              <span className="text-[#5a737e]">{selectedProjectName}</span>
            </div>
          )}
        </div>
      </header>

      {/* Screen Page Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-[#030303] sm:text-2xl">Laporan</h1>
          <p className="text-xs text-[#5a737e] sm:text-sm">
            Ringkasan dan laporan aktivitas karyawan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExportButton
            label="Print"
            icon="print"
            onClick={handlePrint}
            disabled={isExportDisabled}
            loading={exportingType === "print"}
            title={
              isLoading
                ? "Memuat data laporan..."
                : loadError
                  ? "Gagal memuat data laporan"
                  : "Cetak dokumen laporan"
            }
          />
          <ExportButton
            label="Excel"
            icon="download"
            onClick={handleExportExcel}
            disabled={isExportDisabled}
            loading={exportingType === "excel"}
            title={
              isLoading
                ? "Memuat data laporan..."
                : loadError
                  ? "Gagal memuat data laporan"
                  : "Unduh laporan dalam format Excel (.xlsx)"
            }
          />
          <ExportButton
            label="PDF"
            icon="download"
            primary
            onClick={handleExportPdf}
            disabled={isExportDisabled}
            loading={exportingType === "pdf"}
            title={
              isLoading
                ? "Memuat data laporan..."
                : loadError
                  ? "Gagal memuat data laporan"
                  : "Unduh laporan dalam format PDF (.pdf)"
            }
          />
        </div>
      </header>

      {/* Error Banners */}
      {Boolean(loadError) && (
        <p
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 print:hidden"
        >
          Data laporan belum dapat dimuat dari server.
        </p>
      )}

      {Boolean(exportError) && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs text-red-800 print:hidden"
        >
          <div className="flex items-center gap-2">
            <AdminIcon name="shield" className="h-4 w-4 shrink-0 text-red-600" />
            <span>{exportError}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportError(null)}
            aria-label="Tutup pesan error"
            className="rounded-lg p-1 text-red-600 transition-colors hover:bg-red-100/60"
          >
            <AdminIcon name="x" className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Filter Card */}
      <form
        onSubmit={applyFilters}
        className="rounded-xl border border-[#d0e6ed] bg-white p-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-4 print:hidden"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="filter-employee"
              className="block text-xs font-semibold text-[#030303]"
            >
              Karyawan
            </label>
            <select
              id="filter-employee"
              value={draftFilters.userId}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  userId: event.target.value,
                }))
              }
              aria-label="Filter karyawan"
              className="mt-1 h-9 w-full rounded-lg border border-[#c8dfe8] bg-white px-3 text-xs text-[#030303] outline-none transition-colors focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
            >
              <option value="">Semua Karyawan</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                  {employee.division ? ` (${employee.division.name})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-project"
              className="block text-xs font-semibold text-[#030303]"
            >
              Proyek
            </label>
            <select
              id="filter-project"
              value={draftFilters.projectId}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  projectId: event.target.value,
                }))
              }
              aria-label="Filter proyek"
              className="mt-1 h-9 w-full rounded-lg border border-[#c8dfe8] bg-white px-3 text-xs text-[#030303] outline-none transition-colors focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
            >
              <option value="">Semua Proyek</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-start-date"
              className="block text-xs font-semibold text-[#030303]"
            >
              Tanggal Mulai
            </label>
            <input
              id="filter-start-date"
              type="date"
              required
              value={draftFilters.startDate}
              onChange={(event) => handleStartDateChange(event.target.value)}
              aria-label="Tanggal mulai laporan"
              className={`mt-1 h-9 w-full rounded-lg border bg-white px-3 text-xs text-[#030303] outline-none transition-colors focus:ring-2 ${
                filterError
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                  : "border-[#c8dfe8] focus:border-[#016273] focus:ring-[#016273]/20"
              }`}
            />
          </div>

          <div>
            <label
              htmlFor="filter-end-date"
              className="block text-xs font-semibold text-[#030303]"
            >
              Tanggal Akhir
            </label>
            <input
              id="filter-end-date"
              type="date"
              required
              value={draftFilters.endDate}
              onChange={(event) => handleEndDateChange(event.target.value)}
              aria-label="Tanggal akhir laporan"
              className={`mt-1 h-9 w-full rounded-lg border bg-white px-3 text-xs text-[#030303] outline-none transition-colors focus:ring-2 ${
                filterError
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
                  : "border-[#c8dfe8] focus:border-[#016273] focus:ring-[#016273]/20"
              }`}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 border-t border-[#d0e6ed] pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-[1.25rem]">
            {filterError ? (
              <p
                role="alert"
                className="flex items-center gap-1.5 text-xs font-medium text-red-600"
              >
                <svg
                  className="h-3.5 w-3.5 shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
                {filterError}
              </p>
            ) : (
              <span className="text-[11px] text-[#5a737e]">
                Periode data:{" "}
                {formatDateRange(
                  activeFilters.startDate,
                  activeFilters.endDate,
                )}
              </span>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            {hasFilterChanges && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-8.5 items-center justify-center rounded-lg border border-[#d0e6ed] bg-white px-3 text-xs font-medium text-[#5a737e] transition-colors hover:bg-[#EAF7FB] hover:text-[#030303]"
              >
                Reset Filter
              </button>
            )}
            <button
              type="submit"
              disabled={isLoading || Boolean(filterError)}
              className="inline-flex h-8.5 items-center justify-center gap-1.5 rounded-lg bg-[#016273] px-3.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#014d5a] focus:outline-none focus:ring-2 focus:ring-[#016273]/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <AdminIcon name="filter" className="h-3.5 w-3.5" />
              Terapkan Filter
            </button>
          </div>
        </div>
      </form>

      {/* 4 Operational KPI Cards */}
      <section
        aria-label="Statistik Laporan"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5 xl:grid-cols-4 print:grid-cols-4 print:gap-3"
      >
        <StatCard
          title="Total Aktivitas"
          value={isLoading ? "—" : filteredActivities.length}
          detail="Total aktivitas sesuai filter"
          icon="chart"
          tone="blue"
        />
        <StatCard
          title="Menunggu Validasi"
          value={isLoading ? "—" : awaitingCount}
          detail="Menunggu ditinjau reviewer"
          icon="activity"
          tone="yellow"
        />
        <StatCard
          title="Disetujui"
          value={isLoading ? "—" : approvedCount}
          detail="Aktivitas telah disetujui"
          icon="user-check"
          tone="green"
        />
        <StatCard
          title="Perlu Revisi"
          value={isLoading ? "—" : revisionCount}
          detail="Perlu perbaikan oleh karyawan"
          icon="user-minus"
          tone="red"
        />
      </section>

      {/* Report Tabs & Tables */}
      <section className="space-y-3">
        <div className="flex gap-1 overflow-x-auto border-b border-[#d0e6ed] print:hidden">
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

        <div>
          {activeTab === "employees" ? (
            <EmployeeReportTable rows={employeeRows} isLoading={isLoading} />
          ) : (
            <ProjectReportTable rows={projectRows} isLoading={isLoading} />
          )}
        </div>
      </section>
    </main>
  );
}

function ExportButton({
  label,
  icon,
  primary = false,
  onClick,
  disabled = false,
  loading = false,
  title,
}: {
  label: string;
  icon: "print" | "download";
  primary?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      aria-label={label}
      className={`inline-flex h-8.5 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-all ${
        disabled || loading
          ? "cursor-not-allowed opacity-50"
          : "hover:shadow-sm active:scale-[0.98]"
      } ${
        primary
          ? "border-[#016273] bg-[#016273] text-white hover:bg-[#014d5a]"
          : "border-[#016273]/30 bg-white text-[#016273] hover:bg-[#EAF7FB]"
      }`}
    >
      {loading ? (
        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <AdminIcon name={icon} className="h-3.5 w-3.5" />
      )}
      {loading ? "Mengunduh..." : label}
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
      className={`relative shrink-0 px-4 py-2.5 text-xs font-semibold sm:text-sm transition-colors ${
        active
          ? "border-b-2 border-[#016273] text-[#016273] font-bold"
          : "border-b-2 border-transparent text-[#5a737e] hover:text-[#030303]"
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

function formatDateRange(startDate: string, endDate: string) {
  if (!startDate && !endDate) return "Semua Tanggal";
  if (startDate && !endDate) return `Mulai ${formatDateDisplay(startDate)}`;
  if (!startDate && endDate) return `Sampai ${formatDateDisplay(endDate)}`;
  return `${formatDateDisplay(startDate)} – ${formatDateDisplay(endDate)}`;
}

function formatDateDisplay(value: string) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatDateTimeDisplay(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
