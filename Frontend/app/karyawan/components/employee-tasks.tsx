"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminIcon } from "../../admin/components/admin-icons";
import { ApiError } from "../../lib/api-client";
import { getProjectTasks, type ProjectTask, type ProjectTaskStatus } from "../../services/project-task-service";
import { getProjects, type Project } from "../../services/project-service";
import type { PaginationMeta } from "../../services/user-service";

const statusLabels: Record<ProjectTaskStatus, string> = { active: "Aktif", completed: "Selesai", cancelled: "Dibatalkan" };

export default function EmployeeTasks() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState<number | undefined>();
  const [status, setStatus] = useState<ProjectTaskStatus | "">("active");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => { const timeout = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350); return () => window.clearTimeout(timeout); }, [searchInput]);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError("");
      try {
        const [projectItems, response] = await Promise.all([getProjects(), getProjectTasks({ search: search || undefined, projectId, status: status || undefined, page, perPage: 10 })]);
        if (active) { setProjects(projectItems); setTasks(response.data); setMeta(response.meta); }
      } catch (requestError) { if (active) { setTasks([]); setMeta(null); setError(errorMessage(requestError)); } }
      finally { if (active) setLoading(false); }
    }
    void load(); return () => { active = false; };
  }, [page, projectId, requestVersion, search, status]);

  return <main className="space-y-6 p-4 sm:p-7">
    <header><h1 className="text-2xl font-bold text-[#172b4d]">Tugas Saya</h1><p className="mt-1 text-sm text-[#71829a]">Pekerjaan spesifik yang diberikan Project Manager kepada Anda</p></header>
    <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-sm">
      <div className="grid gap-3 border-b border-[#e1e7ee] p-4 md:grid-cols-[minmax(0,1fr)_220px_180px] sm:p-6">
        <label className="relative"><span className="sr-only">Cari tugas</span><AdminIcon name="search" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#71829a]" /><input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Cari judul tugas..." className="h-12 w-full rounded-xl border border-[#dce4ec] pl-12 pr-4 text-sm" /></label>
        <select aria-label="Filter proyek" value={projectId ?? ""} onChange={(event) => { setProjectId(event.target.value ? Number(event.target.value) : undefined); setPage(1); }} className="h-12 rounded-xl border border-[#dce4ec] bg-white px-4 text-sm"><option value="">Semua Proyek</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
        <select aria-label="Filter status" value={status} onChange={(event) => { setStatus(event.target.value as ProjectTaskStatus | ""); setPage(1); }} className="h-12 rounded-xl border border-[#dce4ec] bg-white px-4 text-sm"><option value="active">Aktif</option><option value="completed">Selesai</option><option value="cancelled">Dibatalkan</option><option value="">Semua Status</option></select>
      </div>
      {error ? <div className="p-16 text-center"><p role="alert" className="font-semibold text-red-700">{error}</p><button type="button" onClick={() => setRequestVersion((value) => value + 1)} className="mt-4 rounded-xl bg-[#43a956] px-4 py-2 text-sm font-semibold text-white">Coba Lagi</button></div> : loading ? <Message text="Memuat tugas..." /> : tasks.length === 0 ? <Message text="Belum ada tugas yang diberikan kepada Anda." /> : <div className="grid gap-4 bg-[#f7f9fb] p-4 md:grid-cols-2 xl:grid-cols-3 sm:p-6">{tasks.map((task) => <TaskCard key={task.id} task={task} />)}</div>}
      <Pagination meta={meta} loading={loading} onPage={setPage} />
    </section>
  </main>;
}

function TaskCard({ task }: { task: ProjectTask }) {
  return <article className="flex flex-col rounded-2xl border border-[#dce4ec] bg-white p-5"><div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wide text-[#43a956]">{task.project.name}</p><TaskBadge status={task.status} /></div><h2 className="mt-4 font-bold text-[#172b4d]">{task.title}</h2><p className="mt-2 flex-1 whitespace-pre-wrap text-sm leading-6 text-[#60738f]">{task.description || "Tanpa deskripsi"}</p><p className="mt-4 text-xs text-[#71829a]">Deadline: {task.due_date ? formatDate(task.due_date) : "Tidak ditentukan"}</p>{task.status === "active" && <Link href={`/karyawan/activities?task_id=${task.id}`} className="mt-4 inline-flex justify-center rounded-xl bg-[#43a956] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#368f48]">Catat Aktivitas</Link>}</article>;
}

function Pagination({ meta, loading, onPage }: { meta: PaginationMeta | null; loading: boolean; onPage: (page: number) => void }) { if (!meta) return null; return <footer className="flex flex-col gap-3 border-t border-[#e1e7ee] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-[#71829a]">Menampilkan {meta.from ?? 0}–{meta.to ?? 0} dari {meta.total} tugas</p><div className="flex gap-2"><button type="button" disabled={loading || meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Sebelumnya</button><span className="rounded-lg bg-[#43a956] px-3 py-2 text-sm font-semibold text-white">{meta.current_page} / {meta.last_page}</span><button type="button" disabled={loading || meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Berikutnya</button></div></footer>; }
function TaskBadge({ status }: { status: ProjectTaskStatus }) { const tone = status === "active" ? "bg-green-100 text-green-700" : status === "completed" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"; return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{statusLabels[status]}</span>; }
function Message({ text }: { text: string }) { return <p className="px-6 py-16 text-center text-sm text-[#71829a]">{text}</p>; }
function formatDate(value: string) { const [year, month, day] = value.slice(0, 10).split("-").map(Number); return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(year, month - 1, day)); }
function errorMessage(error: unknown) { if (!(error instanceof ApiError)) return "Tidak dapat terhubung ke server."; if (error.status === 403) return "Anda tidak memiliki akses ke daftar Task."; if (error.status >= 500) return "Server sedang bermasalah. Silakan coba lagi."; return error.message || "Tugas gagal dimuat."; }
