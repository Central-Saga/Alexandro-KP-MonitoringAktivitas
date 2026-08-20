"use client";

import { useEffect, useState } from "react";
import AdminDialog from "../../admin/components/admin-dialog";
import { AdminIcon } from "../../admin/components/admin-icons";
import { ApiError } from "../../lib/api-client";
import { firstFieldError, parseLaravelError, type LaravelFieldErrors } from "../../lib/validation";
import {
  createProjectTask,
  getProjectTasks,
  updateProjectTask,
  updateProjectTaskStatus,
  type ProjectTask,
  type ProjectTaskPayload,
  type ProjectTaskStatus,
} from "../../services/project-task-service";
import { getProjectAssignments, getProjects, type Project, type ProjectAssignment } from "../../services/project-service";
import type { PaginationMeta } from "../../services/user-service";

type DialogState =
  | { type: "create" }
  | { type: "view" | "edit"; task: ProjectTask }
  | { type: "status"; task: ProjectTask; status: "completed" | "cancelled" }
  | null;

const statusLabels: Record<ProjectTaskStatus, string> = {
  active: "Aktif",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export default function ProjectTaskManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState<number | undefined>();
  const [status, setStatus] = useState<ProjectTaskStatus | "">("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [success, setSuccess] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError("");
      try {
        const [projectItems, taskResponse] = await Promise.all([
          getProjects(),
          getProjectTasks({ search: search || undefined, projectId, status: status || undefined, page, perPage: 10 }),
        ]);
        if (active) { setProjects(projectItems); setTasks(taskResponse.data); setMeta(taskResponse.meta); }
      } catch (requestError) {
        if (active) { setTasks([]); setMeta(null); setError(errorMessage(requestError, "Tugas Karyawan gagal dimuat.")); }
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [page, projectId, requestVersion, search, status]);

  function mutationSucceeded(message: string) {
    setDialog(null); setSuccess(message); setRequestVersion((value) => value + 1);
  }

  return <div className="space-y-6">
    <div className="flex justify-end"><button type="button" disabled={loading || projects.length === 0} onClick={() => setDialog({ type: "create" })} className="inline-flex items-center gap-2 rounded-xl bg-[#43a956] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><span className="text-xl" aria-hidden="true">+</span>Berikan Tugas</button></div>
    {success && <div role="status" className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"><span>{success}</span><button type="button" onClick={() => setSuccess("")} aria-label="Tutup pesan"><AdminIcon name="x" className="h-4 w-4" /></button></div>}
    <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-sm">
      <div className="grid gap-3 border-b border-[#e1e7ee] p-4 md:grid-cols-[minmax(0,1fr)_220px_180px] sm:p-6">
        <label className="relative"><span className="sr-only">Cari tugas atau Karyawan</span><AdminIcon name="search" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#71829a]" /><input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Cari tugas atau Karyawan..." className="h-12 w-full rounded-xl border border-[#dce4ec] pl-12 pr-4 text-sm" /></label>
        <select aria-label="Filter proyek Task" value={projectId ?? ""} onChange={(event) => { setProjectId(event.target.value ? Number(event.target.value) : undefined); setPage(1); }} className="h-12 rounded-xl border border-[#dce4ec] bg-white px-4 text-sm"><option value="">Semua Proyek</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
        <select aria-label="Filter status Task" value={status} onChange={(event) => { setStatus(event.target.value as ProjectTaskStatus | ""); setPage(1); }} className="h-12 rounded-xl border border-[#dce4ec] bg-white px-4 text-sm"><option value="">Semua Status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      </div>
      {error ? <ErrorState message={error} onRetry={() => setRequestVersion((value) => value + 1)} /> : <TaskTable tasks={tasks} loading={loading} onView={(task) => setDialog({ type: "view", task })} onEdit={(task) => setDialog({ type: "edit", task })} onStatus={(task, nextStatus) => setDialog({ type: "status", task, status: nextStatus })} />}
      <Pagination meta={meta} loading={loading} onPage={setPage} />
    </section>
    {dialog?.type === "create" && <CreateTaskDialog projects={projects} onClose={() => setDialog(null)} onSuccess={mutationSucceeded} />}
    {dialog?.type === "view" && <ViewTaskDialog task={dialog.task} onClose={() => setDialog(null)} />}
    {dialog?.type === "edit" && <EditTaskDialog task={dialog.task} onClose={() => setDialog(null)} onSuccess={mutationSucceeded} />}
    {dialog?.type === "status" && <StatusTaskDialog task={dialog.task} status={dialog.status} onClose={() => setDialog(null)} onSuccess={mutationSucceeded} />}
  </div>;
}

function TaskTable({ tasks, loading, onView, onEdit, onStatus }: { tasks: ProjectTask[]; loading: boolean; onView: (task: ProjectTask) => void; onEdit: (task: ProjectTask) => void; onStatus: (task: ProjectTask, status: "completed" | "cancelled") => void }) {
  return <div className="max-w-full overflow-x-auto"><table className="w-full min-w-[1180px] text-left text-sm"><thead className="bg-[#f1f4f8] text-[#60738f]"><tr><th className="px-4 py-3">Karyawan</th><th className="px-4 py-3">Divisi</th><th className="px-4 py-3">Proyek</th><th className="px-4 py-3">Tugas</th><th className="px-4 py-3">Deadline</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-center">Aksi</th></tr></thead><tbody>
    {loading ? <TableMessage text="Memuat tugas..." /> : tasks.length === 0 ? <TableMessage text="Belum ada tugas yang cocok." /> : tasks.map((task) => <tr key={task.id} className="border-b border-[#e1e7ee] align-top last:border-0"><td className="px-4 py-4 font-medium text-[#172b4d]">{task.assignee.name}</td><td className="px-4 py-4 text-[#60738f]">{task.assignee.division?.name ?? "—"}</td><td className="px-4 py-4 text-[#60738f]">{task.project.name}</td><td className="px-4 py-4"><p className="font-semibold text-[#172b4d]">{task.title}</p><p className="mt-1 max-w-xs text-xs text-[#71829a]">{task.description || "Tanpa deskripsi"}</p></td><td className="px-4 py-4 text-[#60738f]">{task.due_date ? formatDate(task.due_date) : "—"}</td><td className="px-4 py-4"><TaskStatusBadge status={task.status} /></td><td className="px-4 py-4"><div className="flex flex-wrap justify-center gap-2"><IconButton icon="eye" label={`Lihat ${task.title}`} onClick={() => onView(task)} />{task.status === "active" && <><IconButton icon="edit" label={`Edit ${task.title}`} onClick={() => onEdit(task)} /><button type="button" onClick={() => onStatus(task, "completed")} className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">Selesaikan</button><button type="button" onClick={() => onStatus(task, "cancelled")} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">Batalkan</button></>}</div></td></tr>)}
  </tbody></table></div>;
}

function CreateTaskDialog({ projects, onClose, onSuccess }: { projects: Project[]; onClose: () => void; onSuccess: (message: string) => void }) {
  const [form, setForm] = useState<ProjectTaskPayload>({ project_id: 0, assigned_to: 0, title: "", description: null, due_date: null });
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidateError, setCandidateError] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<LaravelFieldErrors>({});
  const [message, setMessage] = useState("");

  async function selectProject(value: string) {
    const id = value ? Number(value) : 0;
    setForm((current) => ({ ...current, project_id: id, assigned_to: 0 })); setAssignments([]); setCandidateError("");
    if (!id) return;
    setLoadingCandidates(true);
    try {
      const response = await getProjectAssignments(id);
      setAssignments(response.data.filter((assignment) => assignment.status === "aktif" && assignment.user.is_active));
    } catch (requestError) { setCandidateError(errorMessage(requestError, "Anggota aktif gagal dimuat.")); }
    finally { setLoadingCandidates(false); }
  }

  function change<K extends keyof ProjectTaskPayload>(field: K, value: ProjectTaskPayload[K]) {
    setForm((current) => ({ ...current, [field]: value })); setErrors((current) => ({ ...current, [field]: [] }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(""); setErrors({});
    if (!form.project_id || !form.assigned_to || !form.title.trim()) { setMessage("Proyek, Karyawan, dan Judul Tugas wajib diisi."); return; }
    setSaving(true);
    try { const response = await createProjectTask({ ...form, title: form.title.trim(), description: form.description?.trim() || null }); onSuccess(response.message); }
    catch (requestError) { setErrors(parseLaravelError(requestError instanceof ApiError ? requestError.data : null).errors ?? {}); setMessage(errorMessage(requestError, "Task gagal diberikan.")); }
    finally { setSaving(false); }
  }

  return <AdminDialog title="Berikan Tugas" onClose={onClose}><form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
    <Field label="Proyek" error={firstFieldError(errors, "project_id")}><select value={form.project_id || ""} onChange={(event) => void selectProject(event.target.value)} className="h-11 w-full rounded-xl border border-[#dce4ec] bg-white px-3"><option value="">Pilih Proyek</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
    <Field label="Karyawan" error={firstFieldError(errors, "assigned_to")}><select value={form.assigned_to || ""} disabled={!form.project_id || loadingCandidates} onChange={(event) => change("assigned_to", Number(event.target.value))} className="h-11 w-full rounded-xl border border-[#dce4ec] bg-white px-3 disabled:bg-slate-100"><option value="">{loadingCandidates ? "Memuat anggota..." : "Pilih anggota aktif"}</option>{assignments.map((assignment) => <option key={assignment.id} value={assignment.user.id}>{assignment.user.name} — {assignment.user.division?.name ?? "Tanpa divisi"}</option>)}</select></Field>
    {candidateError && <p role="alert" className="text-sm text-red-600">{candidateError}</p>}
    {!loadingCandidates && form.project_id > 0 && !candidateError && assignments.length === 0 && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">Belum ada anggota aktif pada proyek ini.</p>}
    <Field label="Judul Tugas" error={firstFieldError(errors, "title")}><input value={form.title} maxLength={255} onChange={(event) => change("title", event.target.value)} className="h-11 w-full rounded-xl border border-[#dce4ec] px-3" /></Field>
    <Field label="Deskripsi" error={firstFieldError(errors, "description")}><textarea rows={4} value={form.description ?? ""} onChange={(event) => change("description", event.target.value)} className="w-full rounded-xl border border-[#dce4ec] p-3" /></Field>
    <Field label="Deadline (opsional)" error={firstFieldError(errors, "due_date")}><input type="date" value={form.due_date ?? ""} onChange={(event) => change("due_date", event.target.value || null)} className="h-11 w-full rounded-xl border border-[#dce4ec] px-3" /></Field>
    {message && <p role="alert" className="text-sm text-red-600">{message}</p>}
    <DialogActions saving={saving} onClose={onClose} submitLabel="Berikan Tugas" />
  </form></AdminDialog>;
}

function ViewTaskDialog({ task, onClose }: { task: ProjectTask; onClose: () => void }) {
  return <AdminDialog title="Detail Tugas" onClose={onClose}><dl className="grid gap-4 p-5 text-sm sm:grid-cols-2 sm:p-6"><Detail label="Karyawan" value={task.assignee.name} /><Detail label="Divisi" value={task.assignee.division?.name ?? "—"} /><Detail label="Proyek" value={task.project.name} /><Detail label="Deadline" value={task.due_date ? formatDate(task.due_date) : "—"} /><Detail label="Status" value={statusLabels[task.status]} /><Detail label="Dibuat oleh" value={task.created_by.name} /><div className="sm:col-span-2"><Detail label="Judul" value={task.title} /></div><div className="sm:col-span-2"><Detail label="Deskripsi" value={task.description || "—"} /></div></dl></AdminDialog>;
}

function EditTaskDialog({ task, onClose, onSuccess }: { task: ProjectTask; onClose: () => void; onSuccess: (message: string) => void }) {
  const [title, setTitle] = useState(task.title); const [description, setDescription] = useState(task.description ?? ""); const [dueDate, setDueDate] = useState(task.due_date ?? ""); const [saving, setSaving] = useState(false); const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setMessage(""); if (!title.trim()) { setMessage("Judul Tugas wajib diisi."); return; } setSaving(true); try { const response = await updateProjectTask(task.id, { title: title.trim(), description: description.trim() || null, due_date: dueDate || null }); onSuccess(response.message); } catch (requestError) { setMessage(errorMessage(requestError, "Task gagal diperbarui.")); } finally { setSaving(false); } }
  return <AdminDialog title="Edit Tugas" onClose={onClose}><form onSubmit={submit} className="space-y-4 p-5 sm:p-6"><div className="rounded-xl bg-[#f5f7fa] p-3 text-sm"><p className="font-semibold">{task.assignee.name}</p><p className="mt-1 text-xs text-[#71829a]">{task.project.name}</p></div><Field label="Judul Tugas"><input value={title} maxLength={255} onChange={(event) => setTitle(event.target.value)} className="h-11 w-full rounded-xl border border-[#dce4ec] px-3" /></Field><Field label="Deskripsi"><textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-xl border border-[#dce4ec] p-3" /></Field><Field label="Deadline"><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className="h-11 w-full rounded-xl border border-[#dce4ec] px-3" /></Field>{message && <p role="alert" className="text-sm text-red-600">{message}</p>}<DialogActions saving={saving} onClose={onClose} submitLabel="Simpan Perubahan" /></form></AdminDialog>;
}

function StatusTaskDialog({ task, status, onClose, onSuccess }: { task: ProjectTask; status: "completed" | "cancelled"; onClose: () => void; onSuccess: (message: string) => void }) {
  const [saving, setSaving] = useState(false); const [message, setMessage] = useState(""); const completing = status === "completed";
  async function confirm() { setSaving(true); setMessage(""); try { const response = await updateProjectTaskStatus(task.id, status); onSuccess(response.message); } catch (requestError) { setMessage(errorMessage(requestError, "Status Task gagal diperbarui.")); } finally { setSaving(false); } }
  return <AdminDialog title={completing ? "Selesaikan Task" : "Batalkan Task"} onClose={onClose}><div className="space-y-4 p-5 sm:p-6"><p className="font-semibold text-[#172b4d]">{completing ? "Tandai Task sebagai selesai?" : "Batalkan Task ini?"}</p><p className="text-sm leading-6 text-[#60738f]">Task <strong>{task.title}</strong> akan menjadi histori final dan tidak dapat dipakai untuk Activity baru.</p>{message && <p role="alert" className="text-sm text-red-600">{message}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">Batal</button><button type="button" onClick={() => void confirm()} disabled={saving} className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${completing ? "bg-[#43a956]" : "bg-red-600"}`}>{saving ? "Memproses..." : completing ? "Selesaikan" : "Batalkan Task"}</button></div></div></AdminDialog>;
}

function Pagination({ meta, loading, onPage }: { meta: PaginationMeta | null; loading: boolean; onPage: (page: number) => void }) { if (!meta) return null; return <footer className="flex flex-col gap-3 border-t border-[#e1e7ee] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-[#71829a]">Menampilkan {meta.from ?? 0}–{meta.to ?? 0} dari {meta.total} tugas</p><div className="flex gap-2"><button type="button" disabled={loading || meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Sebelumnya</button><span className="rounded-lg bg-[#43a956] px-3 py-2 text-sm font-semibold text-white">{meta.current_page} / {meta.last_page}</span><button type="button" disabled={loading || meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Berikutnya</button></div></footer>; }
function DialogActions({ saving, onClose, submitLabel }: { saving: boolean; onClose: () => void; submitLabel: string }) { return <div className="flex justify-end gap-2"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">Batal</button><button type="submit" disabled={saving} className="rounded-xl bg-[#43a956] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Menyimpan..." : submitLabel}</button></div>; }
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold text-[#172b4d]">{label}<span className="mt-2 block font-normal">{children}</span>{error && <span className="mt-1 block text-xs font-normal text-red-600">{error}</span>}</label>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold text-[#71829a]">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-[#172b4d]">{value}</dd></div>; }
function TaskStatusBadge({ status }: { status: ProjectTaskStatus }) { const tone = status === "active" ? "bg-green-100 text-green-700" : status === "completed" ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"; return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{statusLabels[status]}</span>; }
function IconButton({ icon, label, onClick }: { icon: "eye" | "edit"; label: string; onClick: () => void }) { return <button type="button" aria-label={label} title={label} onClick={onClick} className="rounded-lg bg-slate-100 p-2 text-[#60738f] hover:bg-slate-200"><AdminIcon name={icon} className="h-4 w-4" /></button>; }
function TableMessage({ text }: { text: string }) { return <tr><td colSpan={7} className="px-6 py-16 text-center text-[#71829a]">{text}</td></tr>; }
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="px-6 py-16 text-center"><p role="alert" className="font-semibold text-red-700">{message}</p><button type="button" onClick={onRetry} className="mt-4 rounded-xl bg-[#43a956] px-4 py-2 text-sm font-semibold text-white">Coba Lagi</button></div>; }
function formatDate(value: string) { const [year, month, day] = value.slice(0, 10).split("-").map(Number); return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(year, month - 1, day)); }
function errorMessage(error: unknown, fallback: string) { if (!(error instanceof ApiError)) return "Tidak dapat terhubung ke server."; if (error.status === 403) return "Anda tidak memiliki akses ke Task ini."; if (error.status === 422) return error.message || fallback; if (error.status >= 500) return "Server sedang bermasalah. Silakan coba lagi."; return error.message || fallback; }
