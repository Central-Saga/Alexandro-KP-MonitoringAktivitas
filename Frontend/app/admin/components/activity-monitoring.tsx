"use client";

import { useMemo } from "react";
import {
  type Activity,
  type ActivityStatus,
} from "../../services/activity-service";
import { useActivities } from "../../hooks/use-activities";
import ActivityStatusDistribution from "./activity-status-distribution";
import EmployeePerformanceTable, {
  type EmployeeActivitySummary,
} from "./employee-performance-table";
import StatCard from "./stat-card";

const days = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export default function ActivityMonitoring() {
  const { data: activities, isLoading, error } = useActivities();

  const metrics = useMemo(() => getMonitoringMetrics(activities), [activities]);
  const approvalRate = activities.length
    ? Math.round((metrics.statusCounts.approved / activities.length) * 100)
    : null;

  return (
    <main className="space-y-6 p-4 sm:p-7">
      <header>
        <h2 className="text-2xl font-bold text-[#172b4d]">
          Monitoring Aktivitas
        </h2>
        <p className="mt-1 text-sm text-[#71829a] sm:text-base">
          Pantau performa seluruh karyawan secara real-time
        </p>
      </header>

      {Boolean(error) && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Data monitoring aktivitas belum dapat dimuat.
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Aktivitas Minggu Ini"
          value={isLoading ? "—" : metrics.weeklyTotal}
          detail="Berdasarkan activity_date"
          icon="project"
          tone="green"
        />
        <StatCard
          title="Tingkat Persetujuan"
          value={isLoading || approvalRate === null ? "—" : `${approvalRate}%`}
          detail="Approved dari seluruh aktivitas"
          icon="shield"
          tone="blue"
        />
        <StatCard
          title="Total Jam Kerja"
          value="—"
          detail="Field waktu belum tersedia"
          icon="activity"
          tone="yellow"
        />
        <StatCard
          title="Karyawan Aktif"
          value="—"
          detail="Endpoint user belum tersedia"
          icon="users"
          tone="red"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <WeeklyTrend counts={metrics.weeklyCounts} />
        <ActivityStatusDistribution
          counts={metrics.statusCounts}
          total={activities.length}
        />
      </section>

      <EmployeePerformanceTable
        monthLabel={metrics.monthLabel}
        employees={metrics.employeeSummaries}
      />
    </main>
  );
}

function WeeklyTrend({ counts }: { counts: number[] }) {
  const total = counts.reduce((sum, count) => sum + count, 0);
  const maximum = Math.max(...counts, 1);

  return (
    <section className="rounded-2xl border border-[#dce4ec] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      <header className="border-b border-[#e1e7ee] px-6 py-5">
        <h2 className="font-bold text-[#172b4d]">Tren Aktivitas Mingguan</h2>
      </header>
      <div className="p-6">
        <div className="grid h-40 grid-cols-7 items-end gap-2 sm:gap-3">
          {counts.map((count, index) => (
            <div key={days[index]} className="flex h-full flex-col justify-end">
              <div className="flex h-[118px] items-end rounded-t-md bg-green-50">
                <div
                  className="w-full rounded-t-md bg-[#18a84f] transition-[height]"
                  style={{
                    height: total
                      ? `${Math.max((count / maximum) * 100, count ? 8 : 0)}%`
                      : "0%",
                  }}
                  title={`${count} aktivitas`}
                />
              </div>
              <span className="mt-2 text-center text-xs text-[#60738f]">
                {days[index]}
              </span>
            </div>
          ))}
        </div>
        {total === 0 && (
          <p className="mt-3 text-center text-sm text-[#71829a]">
            Belum ada aktivitas pada minggu ini.
          </p>
        )}
      </div>
    </section>
  );
}

function getMonitoringMetrics(activities: Activity[]) {
  const now = new Date();
  const currentDay = now.getDay() || 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - currentDay + 1);

  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return localDateKey(date);
  });
  const weeklyCounts = weekDates.map(
    (date) =>
      activities.filter(
        (activity) => activity.activity_date.slice(0, 10) === date,
      ).length,
  );

  const statusCounts: Record<ActivityStatus, number> = {
    pending: 0,
    ongoing: 0,
    selesai: 0,
    approved: 0,
  };
  activities.forEach((activity) => {
    if (activity.status in statusCounts) {
      statusCounts[activity.status] += 1;
    }
  });

  const currentMonth = localDateKey(now).slice(0, 7);
  const employeeMap = new Map<number, EmployeeActivitySummary>();
  activities
    .filter((activity) => activity.activity_date.slice(0, 7) === currentMonth)
    .forEach((activity) => {
      const current = employeeMap.get(activity.user_id) ?? {
        userId: activity.user_id,
        total: 0,
        approved: 0,
      };
      current.total += 1;
      current.approved += activity.status === "approved" ? 1 : 0;
      employeeMap.set(activity.user_id, current);
    });

  return {
    weeklyCounts,
    weeklyTotal: weeklyCounts.reduce((sum, count) => sum + count, 0),
    statusCounts,
    employeeSummaries: Array.from(employeeMap.values()).sort(
      (left, right) => right.total - left.total,
    ),
    monthLabel: new Intl.DateTimeFormat("id-ID", {
      month: "long",
      year: "numeric",
    }).format(now),
  };
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
