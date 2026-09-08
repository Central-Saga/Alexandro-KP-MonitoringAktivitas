"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminIcon } from "../../admin/components/admin-icons";
import { ApiError } from "../../lib/api-client";
import {
  getProjectTasks,
  type ProjectTask,
  type ProjectTaskStatus,
} from "../../services/project-task-service";
import { getProjects, type Project } from "../../services/project-service";
import type { PaginationMeta } from "../../services/user-service";

const statusLabels: Record<ProjectTaskStatus, string> = {
  active: "Aktif",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

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

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [projectItems, response] = await Promise.all([
          getProjects(),
          getProjectTasks({
            search: search || undefined,
            projectId,
            status: status || undefined,
            page,
            perPage: 9,
          }),
        ]);
        if (active) {
          setProjects(projectItems);
          setTasks(response.data);
          setMeta(response.meta);
        }
      } catch (requestError) {
        if (active) {
          setTasks([]);
          setMeta(null);
          setError(errorMessage(requestError));
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [page, projectId, requestVersion, search, status]);

  return (
    <main className="space-y-6 p-4 sm:p-7">
      <header>
        <h1 className="text-2xl font-bold text-[#030303]">Tugas Saya</h1>
        <p className="mt-1 text-sm text-[#5a737e]">
          Daftar tugas yang diberikan oleh Project Manager pada proyek Anda.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-[#d0e6ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="grid gap-3 border-b border-[#d0e6ed] p-4 sm:p-6 md:grid-cols-[minmax(0,1fr)_220px_180px]">
          <label className="relative block">
            <span className="sr-only">Cari judul tugas</span>
            <AdminIcon
              name="search"
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8399a2]"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari judul tugas..."
              className="h-11 w-full rounded-xl border border-[#c8dfe8] bg-white pl-12 pr-4 text-sm text-[#030303] outline-none placeholder:text-[#8399a2] focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
            />
          </label>

          <label className="block">
            <span className="sr-only">Filter proyek</span>
            <select
              value={projectId ?? ""}
              onChange={(event) => {
                setProjectId(
                  event.target.value ? Number(event.target.value) : undefined,
                );
                setPage(1);
              }}
              className="h-11 w-full rounded-xl border border-[#c8dfe8] bg-white px-3 text-sm text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
            >
              <option value="">Semua Proyek</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="sr-only">Filter status tugas</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as ProjectTaskStatus | "");
                setPage(1);
              }}
              className="h-11 w-full rounded-xl border border-[#c8dfe8] bg-white px-3 text-sm text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
            >
              <option value="active">Aktif</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
              <option value="">Semua Status</option>
            </select>
          </label>
        </div>

        {error ? (
          <div className="p-16 text-center">
            <p role="alert" className="text-xs font-semibold text-red-700">
              {error}
            </p>
            <button
              type="button"
              onClick={() => setRequestVersion((value) => value + 1)}
              className="mt-4 rounded-xl bg-[#016273] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#014d5a]"
            >
              Coba Lagi
            </button>
          </div>
        ) : loading ? (
          <Message text="Memuat daftar tugas..." />
        ) : tasks.length === 0 ? (
          <Message text="Belum ada tugas yang cocok dengan filter atau pencarian Anda." />
        ) : (
          <div className="grid gap-4 bg-[#EAF7FB]/30 p-4 sm:p-6 md:grid-cols-2 xl:grid-cols-3">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}

        <Pagination meta={meta} loading={loading} onPage={setPage} />
      </section>
    </main>
  );
}

function TaskCard({ task }: { task: ProjectTask }) {
  return (
    <article className="flex flex-col justify-between rounded-2xl border border-[#d0e6ed] bg-white p-5 shadow-xs transition-shadow hover:shadow-sm">
      <div>
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-[11px] font-bold uppercase tracking-wider text-[#016273]">
            {task.project.name}
          </p>
          <TaskBadge status={task.status} />
        </div>
        <h2 className="mt-2 text-sm font-bold text-[#030303]">{task.title}</h2>
        <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-[#5a737e]">
          {task.description || "Tanpa deskripsi."}
        </p>
        <p className="mt-3 text-[11px] text-[#5a737e]">
          Tenggat waktu:{" "}
          <span className="font-semibold text-[#030303]">
            {task.due_date ? formatDate(task.due_date) : "Tidak ditentukan"}
          </span>
        </p>
      </div>

      {task.status === "active" && (
        <Link
          href={`/karyawan/activities?task_id=${task.id}`}
          className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#016273] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#014d5a]"
        >
          Catat Aktivitas
        </Link>
      )}
    </article>
  );
}

function Pagination({
  meta,
  loading,
  onPage,
}: {
  meta: PaginationMeta | null;
  loading: boolean;
  onPage: (page: number) => void;
}) {
  if (!meta) return null;
  return (
    <footer className="flex flex-col gap-3 border-t border-[#d0e6ed] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-[#5a737e]">
        Menampilkan {meta.from ?? 0}–{meta.to ?? 0} dari {meta.total} tugas
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={loading || meta.current_page <= 1}
          onClick={() => onPage(meta.current_page - 1)}
          className="rounded-lg border border-[#d0e6ed] px-3 py-1.5 text-xs font-semibold text-[#5a737e] transition-colors hover:bg-[#EAF7FB] disabled:opacity-40"
        >
          Sebelumnya
        </button>
        <span
          className="rounded-lg bg-[#016273] px-3 py-1.5 text-xs font-bold text-white"
          aria-label={`Halaman ${meta.current_page} dari ${meta.last_page}`}
        >
          {meta.current_page} / {meta.last_page}
        </span>
        <button
          type="button"
          disabled={loading || meta.current_page >= meta.last_page}
          onClick={() => onPage(meta.current_page + 1)}
          className="rounded-lg border border-[#d0e6ed] px-3 py-1.5 text-xs font-semibold text-[#5a737e] transition-colors hover:bg-[#EAF7FB] disabled:opacity-40"
        >
          Berikutnya
        </button>
      </div>
    </footer>
  );
}

function TaskBadge({ status }: { status: ProjectTaskStatus }) {
  const tone =
    status === "active"
      ? "bg-[#EAF7FB] text-[#016273] ring-1 ring-inset ring-[#016273]/20"
      : status === "completed"
        ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
        : "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function Message({ text }: { text: string }) {
  return (
    <p className="px-6 py-16 text-center text-xs text-[#5a737e]">{text}</p>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function errorMessage(error: unknown) {
  if (!(error instanceof ApiError))
    return "Tidak dapat terhubung ke server.";
  if (error.status === 403)
    return "Anda tidak memiliki akses ke daftar tugas.";
  if (error.status >= 500)
    return "Server sedang bermasalah. Silakan coba lagi.";
  return error.message || "Tugas gagal dimuat.";
}
