"use client";

import { useMemo } from "react";
import { useActivities } from "../../hooks/use-activities";
import { useProjects } from "../../hooks/use-projects";
import type { Activity } from "../../services/activity-service";
import ProjectProgress from "./project-progress";
import RecentActivityTable from "./recent-activity-table";
import StatCard from "./stat-card";
import WeeklyActivity from "./weekly-activity";

export default function AdminDashboard() {
  const activitiesState = useActivities();
  const projectsState = useProjects();
  const activities = activitiesState.data;
  const projects = projectsState.data;
  const isLoading = activitiesState.isLoading || projectsState.isLoading;
  const loadError = activitiesState.error ?? projectsState.error;

  const weekly = useMemo(() => getWeeklyMetrics(activities), [activities]);
  const today = localDateKey(new Date());
  const dailyActivities = activities.filter(
    (activity) => activity.activity_date.slice(0, 10) === today,
  ).length;

  return (
    <main className="space-y-6 p-4 sm:p-7">
      {Boolean(loadError) && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Data dashboard belum dapat dimuat.
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total User" value="—" detail="Endpoint belum tersedia" icon="users" tone="green" />
        <StatCard title="Total Divisi" value="—" detail="Endpoint belum tersedia" icon="building" tone="blue" />
        <StatCard title="Total Proyek" value={isLoading ? "—" : projects.length} detail="Data proyek saat ini" icon="project" tone="yellow" />
        <StatCard title="Total Daily Activity" value={isLoading ? "—" : dailyActivities} detail="Aktivitas hari ini" icon="activity" tone="red" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <WeeklyActivity
          counts={weekly.counts}
          total={weekly.total}
          approved={weekly.approved}
          waiting={weekly.waiting}
          hasData={!isLoading && weekly.total > 0}
        />
        <ProjectProgress projects={projects} />
      </section>

      <RecentActivityTable activities={activities} />
    </main>
  );
}

function getWeeklyMetrics(activities: Activity[]) {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - day + 1);
  const dates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return localDateKey(date);
  });
  const weeklyActivities = activities.filter((activity) =>
    dates.includes(activity.activity_date.slice(0, 10)),
  );

  return {
    counts: dates.map(
      (date) =>
        weeklyActivities.filter(
          (activity) => activity.activity_date.slice(0, 10) === date,
        ).length,
    ),
    total: weeklyActivities.length,
    approved: weeklyActivities.filter((activity) => activity.status === "approved").length,
    waiting: weeklyActivities.filter((activity) =>
      ["pending", "ongoing"].includes(activity.status),
    ).length,
  };
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
