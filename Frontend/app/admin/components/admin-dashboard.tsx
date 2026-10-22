"use client";

import { useDashboard } from "../../hooks/use-dashboard";
import ProjectProgress from "./project-progress";
import RecentActivityTable from "./recent-activity-table";
import StatCard from "./stat-card";
import WeeklyActivity from "./weekly-activity";

export default function AdminDashboard() {
  const { data, isLoading, fatalError, refetch } = useDashboard();
  const resources = data
    ? [
        data.userTotal,
        data.divisionTotal,
        data.projects,
        data.dailyActivityTotal,
        data.weeklyActivity,
        data.recentActivities,
      ]
    : [];
  const hasPartialError = Boolean(fatalError) || resources.some((resource) => resource.error !== null);

  return (
    <main className="space-y-6 p-4 sm:p-7" aria-busy={isLoading}>
      {hasPartialError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>Sebagian data dashboard belum dapat dimuat.</span>
          <button type="button" onClick={refetch} className="self-start font-semibold underline sm:self-auto">
            Coba lagi
          </button>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total User"
          value={metricValue(data?.userTotal.data, isLoading)}
          detail={metricDetail(data?.userTotal.error ?? fatalError, isLoading, "Pengguna terdaftar")}
          icon="users"
          tone="green"
        />
        <StatCard
          title="Total Divisi"
          value={metricValue(data?.divisionTotal.data, isLoading)}
          detail={metricDetail(data?.divisionTotal.error ?? fatalError, isLoading, "Seluruh divisi")}
          icon="building"
          tone="blue"
        />
        <StatCard
          title="Total Proyek"
          value={metricValue(data?.projects.data?.length, isLoading)}
          detail={metricDetail(data?.projects.error ?? fatalError, isLoading, "Seluruh proyek")}
          icon="project"
          tone="yellow"
        />
        <StatCard
          title="Aktivitas Hari Ini"
          value={metricValue(data?.dailyActivityTotal.data, isLoading)}
          detail={metricDetail(data?.dailyActivityTotal.error ?? fatalError, isLoading, "Berdasarkan tanggal lokal hari ini")}
          icon="activity"
          tone="red"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <WeeklyActivity
          data={data?.weeklyActivity.data ?? null}
          isLoading={isLoading}
          hasError={Boolean(data?.weeklyActivity.error ?? fatalError)}
        />
        <ProjectProgress
          projects={data?.projects.data ?? null}
          isLoading={isLoading}
          hasError={Boolean(data?.projects.error ?? fatalError)}
        />
      </section>

      <RecentActivityTable
        activities={data?.recentActivities.data ?? null}
        isLoading={isLoading}
        hasError={Boolean(data?.recentActivities.error ?? fatalError)}
      />
    </main>
  );
}

function metricValue(value: number | null | undefined, isLoading: boolean): number | string {
  if (isLoading || value === null || value === undefined) return "—";
  return value;
}

function metricDetail(error: unknown, isLoading: boolean, availableLabel: string): string {
  if (isLoading) return "Memuat data...";
  if (error) return "Data tidak tersedia";
  return availableLabel;
}
