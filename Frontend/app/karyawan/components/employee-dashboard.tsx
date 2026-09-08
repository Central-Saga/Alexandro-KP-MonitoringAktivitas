"use client";

import Link from "next/link";
import { useEmployeeDashboard } from "../../hooks/use-employee-dashboard";
import MediaList from "../../admin/components/media-list";
import StatCard from "../../admin/components/stat-card";
import type { Activity, ActivityStatus } from "../../services/activity-service";
import type { Project } from "../../services/project-service";
import type { ProjectTask } from "../../services/project-task-service";

const statusLabels: Record<ActivityStatus, string> = {
  pending: "Menunggu Validasi",
  ongoing: "Menunggu Validasi",
  selesai: "Menunggu Validasi",
  approved: "Disetujui",
  rejected: "Perlu Revisi",
};

export default function EmployeeDashboard() {
  const { data, isLoading, fatalError, refetch } = useEmployeeDashboard();
  const resources = data ? Object.values(data) : [];
  const hasError =
    Boolean(fatalError) || resources.some((item) => item.error !== null);

  return (
    <main className="space-y-6 p-4 sm:p-7" aria-busy={isLoading}>
      <header>
        <h1 className="text-2xl font-bold text-[#030303]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#5a737e]">
          Ringkasan aktivitas kerja dan tugas penugasan Anda.
        </p>
      </header>

      {hasError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>Sebagian data dashboard belum dapat dimuat.</span>
          <button
            type="button"
            onClick={refetch}
            className="self-start font-semibold underline sm:self-auto"
          >
            Coba lagi
          </button>
        </div>
      )}

      <RevisionActions
        resource={data?.needsRevision ?? null}
        loading={isLoading}
      />

      {/* KPI Stat Cards */}
      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        aria-label="Ringkasan Aktivitas Karyawan"
      >
        <StatCard
          title="Total Aktivitas"
          value={metric(data?.totalActivities.data, isLoading)}
          detail={detail(
            data?.totalActivities.error,
            isLoading,
            "Total aktivitas yang telah dicatat",
          )}
          icon="activity"
          tone="teal"
        />
        <StatCard
          title="Aktivitas Hari Ini"
          value={metric(data?.todayActivities.data, isLoading)}
          detail={detail(
            data?.todayActivities.error,
            isLoading,
            "Aktivitas masuk hari ini",
          )}
          icon="project"
          tone="blue"
        />
        <StatCard
          title="Menunggu Validasi"
          value={metric(data?.awaitingReview.data, isLoading)}
          detail={detail(
            data?.awaitingReview.error,
            isLoading,
            "Menunggu peninjauan Project Manager",
          )}
          icon="shield"
          tone="yellow"
        />
        <StatCard
          title="Disetujui"
          value={metric(data?.approvedActivities.data, isLoading)}
          detail={detail(
            data?.approvedActivities.error,
            isLoading,
            "Aktivitas terverifikasi selesai",
          )}
          icon="user-check"
          tone="green"
        />
        <StatCard
          title="Perlu Revisi"
          value={metric(data?.needsRevision.data?.total, isLoading)}
          detail={detail(
            data?.needsRevision.error,
            isLoading,
            "Aktivitas yang perlu ditindaklanjuti",
          )}
          icon="activity"
          tone="yellow"
        />
      </section>

      {/* Active Tasks Section */}
      <ActiveTasks
        tasks={data?.activeTasks.data ?? null}
        loading={isLoading}
        error={Boolean(data?.activeTasks.error ?? fatalError)}
      />

      {/* Middle Grid: Projects & Recent Activities */}
      <section className="grid gap-6 xl:grid-cols-[minmax(340px,0.95fr)_minmax(0,1.4fr)]">
        <ProjectAssignments
          projects={data?.projects.data ?? null}
          loading={isLoading}
          error={Boolean(data?.projects.error ?? fatalError)}
          onRetry={refetch}
        />

        {/* Recent Activities Panel */}
        <section className="overflow-hidden rounded-2xl border border-[#d0e6ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
          <header className="flex items-center justify-between border-b border-[#d0e6ed] px-5 py-4 sm:px-6">
            <h2 className="text-base font-bold text-[#030303]">
              Aktivitas Terbaru
            </h2>
            <Link
              href="/karyawan/activities?tab=history"
              className="text-xs font-semibold text-[#016273] hover:underline"
            >
              Lihat Semua &rarr;
            </Link>
          </header>
          <div className="divide-y divide-[#d0e6ed] p-4 sm:p-5">
            {isLoading ? (
              <Message text="Memuat aktivitas..." />
            ) : data?.recentActivities.error ? (
              <Message text="Aktivitas terbaru tidak tersedia." />
            ) : !data?.recentActivities.data?.length ? (
              <Message text="Belum ada aktivitas yang dicatat." />
            ) : (
              data.recentActivities.data.map((activity) => (
                <article
                  key={activity.id}
                  className="py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-[#030303]">
                        {activity.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-[#5a737e]">
                        {activity.project?.name ?? "Tanpa proyek"} ·{" "}
                        {formatDate(activity.activity_date)}
                      </p>
                    </div>
                    <ActivityBadge status={activity.status} />
                  </div>
                  {activity.status === "rejected" &&
                    activity.rejection_reason && (
                      <div className="mt-2.5 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                        <span className="font-semibold">Catatan Revisi:</span>{" "}
                        {activity.rejection_reason}
                      </div>
                    )}
                  {activity.media.length > 0 && (
                    <div className="mt-2.5">
                      <MediaList items={activity.media} />
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function RevisionActions({
  resource,
  loading,
}: {
  resource: {
    data: { activities: Activity[]; total: number } | null;
    error: unknown | null;
  } | null;
  loading: boolean;
}) {
  if (loading || resource?.error || !resource?.data?.total) return null;

  return (
    <section
      className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50/70 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
      aria-labelledby="revision-actions-title"
    >
      <header className="flex flex-col gap-3 border-b border-amber-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
            Perlu Ditindaklanjuti
          </p>
          <h2
            id="revision-actions-title"
            className="mt-1 text-base font-bold text-[#030303]"
          >
            ⚠ {resource.data.total} Aktivitas Perlu Revisi
          </h2>
          <p className="mt-1 text-xs text-[#5a737e]">
            Project Manager meminta Anda memperbaiki beberapa aktivitas.
          </p>
        </div>
        <Link
          href="/karyawan/activities?tab=history&status=rejected"
          className="shrink-0 text-xs font-semibold text-amber-800 hover:underline"
        >
          Lihat Aktivitas &rarr;
        </Link>
      </header>

      <div className="divide-y divide-amber-200/80 px-5 sm:px-6">
        {resource.data.activities.map((activity) => {
          const review = latestRevisionRequest(activity);
          const note = review?.note ?? activity.rejection_reason;
          return (
            <article key={activity.id} className="py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#030303]">
                    {activity.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#5a737e]">
                    {activity.project?.name ?? "Tanpa proyek"}
                    {activity.task?.title
                      ? ` • Tugas: ${activity.task.title}`
                      : ""}
                  </p>
                  {note && (
                    <div className="mt-2.5">
                      <p className="text-[11px] font-semibold text-amber-800">
                        Catatan Project Manager
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#5a4a20]">
                        “{note}”
                      </p>
                    </div>
                  )}
                  {review && (
                    <p className="mt-2 text-[11px] text-[#6f6242]">
                      Diminta oleh: {review.actor?.name ?? "Project Manager"} •{" "}
                      {formatDateTime(review.created_at)}
                    </p>
                  )}
                </div>
                <Link
                  href={`/karyawan/activities?tab=history&status=rejected&activity_id=${activity.id}`}
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
                >
                  Perbaiki Sekarang
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      {resource.data.total > 3 && (
        <footer className="border-t border-amber-200 px-5 py-3 sm:px-6">
          <Link
            href="/karyawan/activities?tab=history&status=rejected"
            className="text-xs font-semibold text-amber-800 hover:underline"
          >
            Lihat Semua yang Perlu Revisi &rarr;
          </Link>
        </footer>
      )}
    </section>
  );
}

function latestRevisionRequest(activity: Activity) {
  return [...activity.review_history]
    .reverse()
    .find((review) => review.action === "revision_requested");
}

function ActiveTasks({
  tasks,
  loading,
  error,
}: {
  tasks: ProjectTask[] | null;
  loading: boolean;
  error: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#d0e6ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <header className="flex items-center justify-between border-b border-[#d0e6ed] px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-base font-bold text-[#030303]">Tugas Aktif</h2>
          <p className="mt-0.5 text-xs text-[#5a737e]">
            Tugas yang perlu diselesaikan berdasarkan tenggat waktu
          </p>
        </div>
        <Link
          href="/karyawan/tasks"
          className="text-xs font-semibold text-[#016273] hover:underline"
        >
          Lihat Semua Tugas &rarr;
        </Link>
      </header>
      <div className="grid gap-3.5 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="md:col-span-2 xl:col-span-3">
            <Message text="Memuat tugas aktif..." />
          </div>
        ) : error ? (
          <div className="md:col-span-2 xl:col-span-3">
            <Message text="Tugas aktif tidak tersedia." />
          </div>
        ) : !tasks?.length ? (
          <div className="md:col-span-2 xl:col-span-3">
            <Message text="Belum ada tugas aktif yang diberikan kepada Anda." />
          </div>
        ) : (
          tasks.map((task) => (
            <article
              key={task.id}
              className="flex flex-col justify-between rounded-xl border border-[#d0e6ed] bg-[#fcfdfe] p-4 transition-colors hover:bg-[#EAF7FB]/40"
            >
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#016273]">
                  {task.project.name}
                </p>
                <h3 className="mt-1.5 text-sm font-bold text-[#030303]">
                  {task.title}
                </h3>
                <p className="mt-2 text-xs text-[#5a737e]">
                  Tenggat:{" "}
                  <span className="font-semibold text-[#030303]">
                    {task.due_date ? formatDate(task.due_date) : "Tidak ditentukan"}
                  </span>
                </p>
              </div>
              <Link
                href={`/karyawan/activities?task_id=${task.id}`}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#016273] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#014d5a]"
              >
                Catat Aktivitas
              </Link>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function ProjectAssignments({
  projects,
  loading,
  error,
  onRetry,
}: {
  projects: Project[] | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#d0e6ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <header className="border-b border-[#d0e6ed] px-5 py-4 sm:px-6">
        <h2 className="text-base font-bold text-[#030303]">Proyek Saya</h2>
        <p className="mt-0.5 text-xs text-[#5a737e]">
          Proyek di mana Anda terdaftar sebagai anggota tim
        </p>
      </header>
      <div className="space-y-3 p-4 sm:p-5">
        {loading ? (
          <Message text="Memuat proyek penugasan..." />
        ) : error ? (
          <div className="py-8 text-center">
            <p className="text-xs font-semibold text-red-700">
              Proyek penugasan gagal dimuat.
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-xl bg-[#016273] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#014d5a]"
            >
              Coba lagi
            </button>
          </div>
        ) : !projects?.length ? (
          <Message text="Belum ada proyek yang ditugaskan kepada Anda." />
        ) : (
          projects.map((project) => (
            <article
              key={project.id}
              className="rounded-xl border border-[#d0e6ed] bg-[#fcfdfe] p-4 transition-colors hover:bg-[#EAF7FB]/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-[#030303]">
                    {project.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#5a737e]">
                    {project.client_name}
                  </p>
                </div>
                <ProjectStatus status={project.status} />
              </div>
              <dl className="mt-3 space-y-1 text-xs text-[#5a737e]">
                <div className="flex gap-2">
                  <dt className="shrink-0 font-semibold text-[#030303]">
                    Project Manager:
                  </dt>
                  <dd className="truncate">
                    {project.project_manager?.name ?? "—"}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="shrink-0 font-semibold text-[#030303]">
                    Periode:
                  </dt>
                  <dd>
                    {formatPeriod(project.start_date, project.end_date)}
                  </dd>
                </div>
              </dl>
              <Link
                href="/karyawan/tasks"
                className="mt-3.5 inline-flex w-full items-center justify-center rounded-xl border border-[#d0e6ed] bg-white px-4 py-2 text-xs font-semibold text-[#030303] shadow-2xs transition-colors hover:bg-[#EAF7FB]"
              >
                Lihat Daftar Tugas
              </Link>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function Message({ text }: { text: string }) {
  return (
    <p className="py-10 text-center text-xs text-[#5a737e]">{text}</p>
  );
}

function metric(
  value: number | null | undefined,
  loading: boolean,
): number | string {
  return loading || value === null || value === undefined ? "—" : value;
}

function detail(error: unknown, loading: boolean, text: string) {
  if (loading) return "Memuat data...";
  return error ? "Data tidak tersedia" : text;
}

function ActivityBadge({ status }: { status: ActivityStatus }) {
  const tone =
    status === "approved"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
      : status === "rejected"
        ? "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20"
        : "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20";
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function ProjectStatus({ status }: { status: string }) {
  const finished = status === "selesai";
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
        finished
          ? "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20"
          : "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
      }`}
    >
      {formatStatus(status)}
    </span>
  );
}

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPeriod(startDate: string, endDate: string | null) {
  return `${formatDate(startDate)} – ${
    endDate ? formatDate(endDate) : "Belum ditentukan"
  }`;
}
