"use client";

import Link from "next/link";
import { useEmployeeDashboard } from "../../hooks/use-employee-dashboard";
import MediaList from "../../admin/components/media-list";
import StatCard from "../../admin/components/stat-card";
import type { ActivityStatus } from "../../services/activity-service";
import type { Project } from "../../services/project-service";
import type { ProjectTask } from "../../services/project-task-service";

export default function EmployeeDashboard() {
  const { data, isLoading, fatalError, refetch } = useEmployeeDashboard();
  const resources = data ? Object.values(data) : [];
  const hasError = Boolean(fatalError) || resources.some((item) => item.error !== null);
  return <main className="space-y-6 p-4 sm:p-7" aria-busy={isLoading}>
    <header><h1 className="text-2xl font-bold text-[#172b4d]">Dashboard Karyawan</h1><p className="mt-1 text-sm text-[#71829a]">Ringkasan project dan aktivitas Anda</p></header>
    {hasError && <div role="alert" className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between"><span>Sebagian data dashboard belum dapat dimuat.</span><button type="button" onClick={refetch} className="self-start font-semibold underline sm:self-auto">Coba lagi</button></div>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Total Aktivitas Saya" value={metric(data?.totalActivities.data, isLoading)} detail={detail(data?.totalActivities.error, isLoading)} icon="activity" tone="green" />
      <StatCard title="Aktivitas Hari Ini" value={metric(data?.todayActivities.data, isLoading)} detail={detail(data?.todayActivities.error, isLoading)} icon="project" tone="blue" />
      <StatCard title="Menunggu Validasi" value={metric(data?.awaitingReview.data, isLoading)} detail={detail(data?.awaitingReview.error, isLoading)} icon="shield" tone="yellow" />
      <StatCard title="Disetujui" value={metric(data?.approvedActivities.data, isLoading)} detail={detail(data?.approvedActivities.error, isLoading)} icon="user-check" tone="red" />
    </section>
    <ActiveTasks tasks={data?.activeTasks.data ?? null} loading={isLoading} error={Boolean(data?.activeTasks.error ?? fatalError)} />
    <section className="grid gap-6 xl:grid-cols-[minmax(340px,0.9fr)_minmax(0,1.4fr)]">
      <ProjectAssignments projects={data?.projects.data ?? null} loading={isLoading} error={Boolean(data?.projects.error ?? fatalError)} onRetry={refetch} />
      <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-sm"><header className="flex items-center justify-between border-b border-[#e1e7ee] px-6 py-5"><h2 className="font-bold text-[#172b4d]">Aktivitas Terbaru</h2><Link href="/karyawan/activities?tab=history" className="text-sm font-semibold text-[#2f9e44] hover:underline">Lihat Semua</Link></header><div className="divide-y divide-[#e1e7ee] px-5">{isLoading ? <Message text="Memuat aktivitas..." /> : data?.recentActivities.error ? <Message text="Aktivitas terbaru tidak tersedia." /> : !data?.recentActivities.data?.length ? <Message text="Belum ada aktivitas." /> : data.recentActivities.data.map((activity) => <article key={activity.id} className="py-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="font-semibold text-[#172b4d]">{activity.title}</h3><p className="mt-1 text-xs text-[#71829a]">{activity.project?.name ?? "Tanpa project"} · {formatDate(activity.activity_date)}</p></div><ActivityBadge status={activity.status} /></div>{activity.status === "rejected" && activity.rejection_reason && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">Alasan: {activity.rejection_reason}</p>}<MediaList items={activity.media} /></article>)}</div></section>
    </section>
  </main>;
}

function ActiveTasks({ tasks, loading, error }: { tasks: ProjectTask[] | null; loading: boolean; error: boolean }) {
  return <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-sm"><header className="flex items-center justify-between border-b border-[#e1e7ee] px-6 py-5"><div><h2 className="font-bold text-[#172b4d]">Tugas Aktif</h2><p className="mt-1 text-xs text-[#71829a]">Tugas terbaru berdasarkan deadline</p></div><Link href="/karyawan/tasks" className="text-sm font-semibold text-[#2f9e44] hover:underline">Lihat Semua</Link></header><div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">{loading ? <div className="md:col-span-2 xl:col-span-3"><Message text="Memuat tugas aktif..." /></div> : error ? <div className="md:col-span-2 xl:col-span-3"><Message text="Tugas aktif tidak tersedia." /></div> : !tasks?.length ? <div className="md:col-span-2 xl:col-span-3"><Message text="Belum ada tugas aktif yang diberikan kepada Anda." /></div> : tasks.map((task) => <article key={task.id} className="flex flex-col rounded-xl border border-[#e1e7ee] p-4"><p className="text-xs font-semibold text-[#43a956]">{task.project.name}</p><h3 className="mt-2 font-semibold text-[#172b4d]">{task.title}</h3><p className="mt-2 flex-1 text-xs leading-5 text-[#71829a]">Deadline: {task.due_date ? formatDate(task.due_date) : "Tidak ditentukan"}</p><Link href={`/karyawan/activities?task_id=${task.id}`} className="mt-4 rounded-lg bg-[#43a956] px-4 py-2 text-center text-xs font-semibold text-white">Catat Aktivitas</Link></article>)}</div></section>;
}

function ProjectAssignments({ projects, loading, error, onRetry }: { projects: Project[] | null; loading: boolean; error: boolean; onRetry: () => void }) {
  return <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-sm">
    <header className="border-b border-[#e1e7ee] px-6 py-5"><h2 className="font-bold text-[#172b4d]">Proyek Saya</h2><p className="mt-1 text-xs text-[#71829a]">Project assignment aktif Anda</p></header>
    <div className="space-y-3 p-5">
      {loading ? <Message text="Memuat proyek assignment..." /> : error ? <div className="py-8 text-center"><p className="text-sm text-red-700">Proyek assignment gagal dimuat.</p><button type="button" onClick={onRetry} className="mt-3 rounded-lg bg-[#43a956] px-4 py-2 text-xs font-semibold text-white">Coba lagi</button></div> : !projects?.length ? <Message text="Belum ada proyek yang ditugaskan kepada Anda." /> : projects.map((project) => <article key={project.id} className="rounded-xl border border-[#e1e7ee] p-4">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold text-[#172b4d]">{project.name}</h3><p className="mt-1 text-xs text-[#71829a]">{project.client_name}</p></div><ProjectStatus status={project.status} /></div>
        <dl className="mt-4 space-y-2 text-xs text-[#60738f]"><div className="flex gap-2"><dt className="shrink-0 font-semibold text-[#52657f]">Project Manager:</dt><dd className="truncate">{project.project_manager?.name ?? "—"}</dd></div><div className="flex gap-2"><dt className="shrink-0 font-semibold text-[#52657f]">Periode:</dt><dd>{formatPeriod(project.start_date, project.end_date)}</dd></div></dl>
        <Link href="/karyawan/tasks" className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-[#43a956] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#368f48]">Lihat Tugas</Link>
      </article>)}
    </div>
  </section>;
}

function Message({ text }: { text: string }) { return <p className="py-10 text-center text-sm text-[#71829a]">{text}</p>; }
function metric(value: number | null | undefined, loading: boolean): number | string { return loading || value === null || value === undefined ? "—" : value; }
function detail(error: unknown, loading: boolean) { if (loading) return "Memuat data..."; return error ? "Data tidak tersedia" : "Berdasarkan seluruh data Anda"; }
const statusLabels: Record<ActivityStatus, string> = { pending: "Menunggu Validasi", ongoing: "Menunggu Validasi", selesai: "Menunggu Validasi", approved: "Disetujui", rejected: "Perlu Revisi" };
function ActivityBadge({ status }: { status: ActivityStatus }) { const tone = status === "approved" ? "bg-green-100 text-green-700" : status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"; return <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{statusLabels[status]}</span>; }
function ProjectStatus({ status }: { status: string }) { const finished = status === "selesai"; return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${finished ? "bg-slate-100 text-slate-600" : "bg-green-100 text-green-700"}`}>{formatStatus(status)}</span>; }
function formatStatus(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function formatDate(value: string) { const [year, month, day] = value.slice(0, 10).split("-").map(Number); return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(year, month - 1, day)); }
function formatPeriod(startDate: string, endDate: string | null) { return `${formatDate(startDate)} – ${endDate ? formatDate(endDate) : "Belum ditentukan"}`; }
