"use client";

import { useEffect, useMemo, useState } from "react";
import { useProjects } from "../../hooks/use-projects";
import { ApiError } from "../../lib/api-client";
import { firstFieldError, parseLaravelError, type LaravelFieldErrors } from "../../lib/validation";
import {
  createProject,
  createProjectAssignment,
  getProject,
  updateProject,
  updateProjectAssignment,
  type Project,
  type ProjectAssignment,
  type ProjectPayload,
} from "../../services/project-service";
import { getUsers, type ManagedUser } from "../../services/user-service";
import AdminDialog from "./admin-dialog";
import { AdminIcon } from "./admin-icons";

type DialogState =
  | { type: "create" }
  | { type: "view" | "edit" | "members"; project: Project }
  | null;

export default function ProjectManagement() {
  const projectsState = useProjects();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Endpoint Project masih berupa collection non-paginated. Search/filter
  // client-side diterapkan pada seluruh collection, bukan potongan halaman.
  const statuses = useMemo(
    () => [...new Set(projectsState.data.map((project) => project.status))].sort(),
    [projectsState.data],
  );
  const visibleProjects = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("id-ID");
    return projectsState.data.filter((project) => {
      const matchesSearch = !term || [project.name, project.client_name, project.project_manager?.name]
        .some((value) => value?.toLocaleLowerCase("id-ID").includes(term));
      return matchesSearch && (!status || project.status === status);
    });
  }, [projectsState.data, search, status]);

  const mutationSucceeded = (message: string) => {
    setDialog(null);
    setSuccessMessage(message);
    projectsState.refetch();
  };

  return (
    <main className="space-y-6 p-4 sm:p-7">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#172b4d]">Manajemen Proyek</h1>
          <p className="mt-1 text-sm text-[#60738f]">
            {projectsState.error || projectsState.isLoading ? "Kelola project dan penugasan anggota" : `${projectsState.data.length} project terdaftar`}
          </p>
        </div>
        <button type="button" onClick={() => setDialog({ type: "create" })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#18a84f] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#149344]">
          <span aria-hidden="true" className="text-xl leading-none">+</span> Tambah Proyek
        </button>
      </header>

      {successMessage && (
        <div role="status" className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <span>{successMessage}</span>
          <button type="button" aria-label="Tutup pesan" onClick={() => setSuccessMessage("")}><AdminIcon name="x" className="h-4 w-4" /></button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
        <div className="grid gap-3 border-b border-[#e1e7ee] p-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:p-6">
          <label className="relative">
            <span className="sr-only">Cari project</span>
            <AdminIcon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#71829a]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama proyek, client, atau Project Manager..." className="h-12 w-full rounded-xl border border-[#dce4ec] pl-12 pr-4 text-sm outline-none focus:border-[#43a956] focus:ring-2 focus:ring-[#43a956]/20" />
          </label>
          <label>
            <span className="sr-only">Filter status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-12 w-full rounded-xl border border-[#dce4ec] bg-white px-4 text-sm text-[#60738f] outline-none focus:border-[#43a956]">
              <option value="">Semua status</option>
              {statuses.map((value) => <option key={value} value={value}>{formatStatus(value)}</option>)}
            </select>
          </label>
        </div>

        {projectsState.error ? (
          <ErrorState onRetry={projectsState.refetch} />
        ) : (
          <ProjectTable
            projects={visibleProjects}
            isLoading={projectsState.isLoading}
            onView={(project) => setDialog({ type: "view", project })}
            onEdit={(project) => setDialog({ type: "edit", project })}
            onMembers={(project) => setDialog({ type: "members", project })}
          />
        )}
      </section>

      {dialog?.type === "create" && <ProjectFormDialog mode="create" onClose={() => setDialog(null)} onSuccess={mutationSucceeded} />}
      {dialog?.type === "edit" && <ProjectFormDialog mode="edit" projectId={dialog.project.id} onClose={() => setDialog(null)} onSuccess={mutationSucceeded} />}
      {dialog?.type === "view" && <ProjectDetailDialog projectId={dialog.project.id} onClose={() => setDialog(null)} />}
      {dialog?.type === "members" && <ProjectMembersDialog project={dialog.project} onClose={() => setDialog(null)} onMutation={() => projectsState.refetch()} />}
    </main>
  );
}

function ProjectTable({ projects, isLoading, onView, onEdit, onMembers }: {
  projects: Project[];
  isLoading: boolean;
  onView: (project: Project) => void;
  onEdit: (project: Project) => void;
  onMembers: (project: Project) => void;
}) {
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm">
        <thead className="bg-[#f1f4f8] text-[#60738f]"><tr><th className="px-5 py-3 font-semibold">Proyek</th><th className="px-5 py-3 font-semibold">Client</th><th className="px-5 py-3 font-semibold">Project Manager</th><th className="px-5 py-3 font-semibold">Periode</th><th className="px-5 py-3 font-semibold">Anggota Aktif</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 text-center font-semibold">Aksi</th></tr></thead>
        <tbody>
          {isLoading ? <TableMessage message="Memuat data project..." /> : projects.length === 0 ? <TableMessage message="Belum ada project yang cocok dengan pencarian atau filter." /> : projects.map((project) => (
            <tr key={project.id} className="border-b border-[#e1e7ee] last:border-0">
              <td className="px-5 py-4"><p className="font-semibold text-[#172b4d]">{project.name}</p></td>
              <td className="px-5 py-4 text-[#60738f]">{project.client_name || "—"}</td>
              <td className="px-5 py-4 text-[#60738f]">{project.project_manager?.name ?? "—"}</td>
              <td className="px-5 py-4 text-[#60738f]">{formatDate(project.start_date)} – {formatDate(project.end_date)}</td>
              <td className="px-5 py-4 font-semibold text-[#172b4d]">{project.active_assignments_count}</td>
              <td className="px-5 py-4"><StatusBadge status={project.status} /></td>
              <td className="px-5 py-4"><div className="flex justify-center gap-2"><ActionButton label="Lihat detail" icon="eye" onClick={() => onView(project)} /><ActionButton label="Edit project" icon="edit" onClick={() => onEdit(project)} /><ActionButton label="Kelola anggota" icon="users" onClick={() => onMembers(project)} /></div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProjectFormDialog({ mode, projectId, onClose, onSuccess }: { mode: "create" | "edit"; projectId?: number; onClose: () => void; onSuccess: (message: string) => void }) {
  const [form, setForm] = useState({ project_manager_id: 0, name: "", client_name: "", start_date: "", end_date: "", status: "" });
  const [managers, setManagers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<LaravelFieldErrors>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    // Kandidat PM berasal dari User API dan difilter lagi oleh backend saat
    // mutation; dropdown bukan satu-satunya lapisan authorization.
    const managerRequest = getUsers({ role: "project_manager", status: "active", page: 1, perPage: 100 });
    const projectRequest = mode === "edit" && projectId ? getProject(projectId) : Promise.resolve(null);
    void Promise.all([managerRequest, projectRequest]).then(([users, projectResponse]) => {
      if (!active) return;
      setManagers(users.data);
      if (projectResponse) {
        const project = projectResponse.data;
        setForm({ project_manager_id: project.project_manager_id, name: project.name, client_name: project.client_name, start_date: project.start_date, end_date: project.end_date ?? "", status: project.status });
      } else if (users.data[0]) {
        setForm((current) => ({ ...current, project_manager_id: users.data[0].id }));
      }
    }).catch((error) => setMessage(getErrorMessage(error, "Form project gagal dimuat."))).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [mode, projectId]);

  function change(field: keyof typeof form, value: string | number) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: [] }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrors({});
    const clientErrors = validateProject(form);
    if (Object.keys(clientErrors).length) { setErrors(clientErrors); return; }
    setSaving(true);
    const payload: ProjectPayload = {
      project_manager_id: form.project_manager_id,
      name: form.name.trim(),
      client_name: form.client_name.trim(),
      start_date: form.start_date,
      end_date: form.end_date || null,
      ...(form.status.trim() ? { status: form.status.trim() } : {}),
    };
    try {
      const response = mode === "create" ? await createProject(payload) : await updateProject(projectId!, payload);
      onSuccess(response.message);
    } catch (error) {
      // Laravel 422 dipetakan kembali ke field agar admin dapat memperbaiki
      // payload tanpa kehilangan nilai form yang sudah diisi.
      setErrors(parseLaravelError(error instanceof ApiError ? error.data : null).errors ?? {});
      setMessage(getErrorMessage(error, "Project gagal disimpan."));
    } finally { setSaving(false); }
  }

  if (loading) return <AdminDialog title={mode === "create" ? "Tambah Proyek" : "Edit Proyek"} onClose={onClose}><p className="p-6 text-sm text-[#71829a]">Memuat form project...</p></AdminDialog>;

  return (
    <AdminDialog title={mode === "create" ? "Tambah Proyek" : "Edit Proyek"} onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <Field id="project-name" label="Nama Proyek" value={form.name} error={firstFieldError(errors, "name")} onChange={(value) => change("name", value)} />
        <Field id="project-client" label="Client" value={form.client_name} error={firstFieldError(errors, "client_name")} onChange={(value) => change("client_name", value)} />
        <label className="block text-sm font-semibold text-[#172b4d] sm:col-span-2">Project Manager<select required value={form.project_manager_id || ""} onChange={(event) => change("project_manager_id", Number(event.target.value))} className="mt-2 h-11 w-full rounded-xl border border-[#dce4ec] bg-white px-4 font-normal outline-none focus:border-[#43a956]"><option value="" disabled>Pilih Project Manager</option>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</select>{firstFieldError(errors, "project_manager_id") && <span className="mt-1 block text-xs font-normal text-red-600">{firstFieldError(errors, "project_manager_id")}</span>}{managers.length === 0 && <span className="mt-1 block text-xs font-normal text-amber-700">Tidak ada Project Manager aktif yang tersedia.</span>}</label>
        <Field id="project-start" label="Tanggal Mulai" type="date" value={form.start_date} error={firstFieldError(errors, "start_date")} onChange={(value) => change("start_date", value)} />
        <Field id="project-end" label="Tanggal Selesai" type="date" required={false} value={form.end_date} error={firstFieldError(errors, "end_date")} onChange={(value) => change("end_date", value)} />
        {mode === "edit" && <Field id="project-status" label="Status" value={form.status} error={firstFieldError(errors, "status")} onChange={(value) => change("status", value)} />}
        {message && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{message}</p>}
        <div className="flex justify-end gap-2 pt-2 sm:col-span-2"><button type="button" onClick={onClose} className="rounded-xl border border-[#dce4ec] px-4 py-2.5 text-sm font-semibold text-[#60738f]">Batal</button><button type="submit" disabled={saving || managers.length === 0} className="rounded-xl bg-[#43a956] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Menyimpan..." : "Simpan"}</button></div>
      </form>
    </AdminDialog>
  );
}

function ProjectDetailDialog({ projectId, onClose }: { projectId: number; onClose: () => void }) {
  const [project, setProject] = useState<Project | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => { let active = true; void getProject(projectId).then((response) => { if (active) setProject(response.data); }).catch((error) => { if (active) setMessage(getErrorMessage(error, "Detail project gagal dimuat.")); }); return () => { active = false; }; }, [projectId]);
  return <AdminDialog title="Detail Proyek" onClose={onClose}><div className="p-5 sm:p-6">{message ? <p role="alert" className="text-sm text-red-600">{message}</p> : !project ? <p className="text-sm text-[#71829a]">Memuat detail project...</p> : <dl className="grid gap-5 sm:grid-cols-2"><Detail label="Nama Proyek" value={project.name} /><Detail label="Client" value={project.client_name || "—"} /><Detail label="Project Manager" value={project.project_manager?.name ?? "—"} /><Detail label="Status" value={formatStatus(project.status)} /><Detail label="Tanggal Mulai" value={formatDate(project.start_date)} /><Detail label="Tanggal Selesai" value={formatDate(project.end_date)} /><Detail label="Anggota Aktif" value={String(project.active_assignments_count)} /><Detail label="Progress" value="Belum tersedia dari backend" /></dl>}</div></AdminDialog>;
}

function ProjectMembersDialog({ project, onClose, onMutation }: { project: Project; onClose: () => void; onMutation: () => void }) {
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [candidates, setCandidates] = useState<ManagedUser[]>([]);
  const [userId, setUserId] = useState(0);
  const [projectRole, setProjectRole] = useState("");
  const [startDate, setStartDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<LaravelFieldErrors>({});
  const [requestVersion, setRequestVersion] = useState(0);

  const reload = () => {
    setLoading(true);
    setRequestVersion((current) => current + 1);
  };
  useEffect(() => {
    let active = true;
    void Promise.all([getProject(project.id), getUsers({ role: "karyawan", status: "active", page: 1, perPage: 100 })])
      .then(([projectResponse, users]) => {
        if (!active) return;
        setAssignments(projectResponse.data.assignments ?? []);
        setCandidates(users.data);
      })
      .catch((error) => { if (active) setMessage(getErrorMessage(error, "Data anggota gagal dimuat.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [project.id, requestVersion]);

  const assignedIds = new Set(assignments.map((assignment) => assignment.user_id));
  const availableCandidates = candidates.filter((candidate) => !assignedIds.has(candidate.id));

  async function addMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage(""); setErrors({});
    try {
      const response = await createProjectAssignment(project.id, { user_id: userId, project_role: projectRole.trim(), start_date: startDate });
      setMessage(response.message); setUserId(0); setProjectRole(""); setStartDate(""); reload(); onMutation();
    } catch (error) {
      setErrors(parseLaravelError(error instanceof ApiError ? error.data : null).errors ?? {});
      setMessage(getErrorMessage(error, "Anggota gagal ditambahkan."));
    } finally { setSaving(false); }
  }

  async function toggleAssignment(assignment: ProjectAssignment) {
    setSaving(true); setMessage("");
    const nextStatus = assignment.status === "aktif" ? "nonaktif" : "aktif";
    try {
      const response = await updateProjectAssignment(project.id, assignment.id, { status: nextStatus });
      setMessage(response.message); reload(); onMutation();
    } catch (error) { setMessage(getErrorMessage(error, "Status assignment gagal diperbarui.")); }
    finally { setSaving(false); }
  }

  return (
    <AdminDialog title={`Anggota — ${project.name}`} onClose={onClose}>
      <div className="space-y-5 p-5 sm:p-6">
        <form onSubmit={addMember} className="grid gap-3 rounded-xl bg-[#f5f7fa] p-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#172b4d] sm:col-span-2">Karyawan<select required value={userId || ""} onChange={(event) => setUserId(Number(event.target.value))} className="mt-2 h-11 w-full rounded-xl border border-[#dce4ec] bg-white px-3 font-normal"><option value="" disabled>Pilih Karyawan aktif</option>{availableCandidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}{candidate.division ? ` — ${candidate.division.name}` : ""}</option>)}</select>{firstFieldError(errors, "user_id") && <span className="mt-1 block text-xs font-normal text-red-600">{firstFieldError(errors, "user_id")}</span>}</label>
          <Field id="assignment-role" label="Peran di Proyek" value={projectRole} error={firstFieldError(errors, "project_role")} onChange={setProjectRole} />
          <Field id="assignment-start" label="Tanggal Mulai" type="date" value={startDate} error={firstFieldError(errors, "start_date")} onChange={setStartDate} />
          <div className="sm:col-span-2"><button type="submit" disabled={saving || availableCandidates.length === 0} className="rounded-xl bg-[#43a956] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Memproses..." : "Tambah Anggota"}</button></div>
          {availableCandidates.length === 0 && <p className="text-xs text-[#71829a] sm:col-span-2">Tidak ada Karyawan aktif lain yang dapat ditambahkan.</p>}
        </form>
        {message && <p role="status" className="text-sm text-[#60738f]">{message}</p>}
        {loading ? <p className="py-8 text-center text-sm text-[#71829a]">Memuat anggota...</p> : assignments.length === 0 ? <p className="py-8 text-center text-sm text-[#71829a]">Belum ada anggota pada project ini.</p> : <div className="divide-y divide-[#e1e7ee]">{assignments.map((assignment) => <div key={assignment.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-[#172b4d]">{assignment.user.name}</p><p className="mt-1 text-xs text-[#71829a]">{assignment.project_role} · {assignment.user.division?.name ?? "Tanpa divisi"} · mulai {formatDate(assignment.start_date)}</p></div><div className="flex items-center gap-2"><AssignmentBadge status={assignment.status} /><button type="button" disabled={saving || (!assignment.user.is_active && assignment.status !== "aktif")} onClick={() => void toggleAssignment(assignment)} className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40 ${assignment.status === "aktif" ? "border-red-200 text-red-600" : "border-green-200 text-green-700"}`}>{assignment.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}</button></div></div>)}</div>}
        <p className="text-xs leading-5 text-[#71829a]">Assignment dinonaktifkan, bukan dihapus, agar histori project tetap dapat diaudit. Backend tetap memvalidasi role dan status akun saat penambahan.</p>
      </div>
    </AdminDialog>
  );
}

function Field({ id, label, value, onChange, error, type = "text", required = true }: { id: string; label: string; value: string; onChange: (value: string) => void; error: string; type?: string; required?: boolean }) { return <label htmlFor={id} className="block text-sm font-semibold text-[#172b4d]">{label}<input id={id} type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} className="mt-2 h-11 w-full rounded-xl border border-[#dce4ec] px-3 font-normal outline-none focus:border-[#43a956] focus:ring-2 focus:ring-[#43a956]/20" />{error && <span className="mt-1 block text-xs font-normal text-red-600">{error}</span>}</label>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-[#71829a]">{label}</dt><dd className="mt-1 font-medium text-[#172b4d]">{value}</dd></div>; }
function ActionButton({ label, icon, onClick }: { label: string; icon: "eye" | "edit" | "users"; onClick: () => void }) { return <button type="button" aria-label={label} title={label} onClick={onClick} className="rounded-lg border border-[#dce4ec] p-2 text-[#60738f] hover:border-[#43a956] hover:text-[#2f9e44]"><AdminIcon name={icon} className="h-4 w-4" /></button>; }
function StatusBadge({ status }: { status: string }) { return <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">{formatStatus(status)}</span>; }
function AssignmentBadge({ status }: { status: ProjectAssignment["status"] }) { return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status === "aktif" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>{status === "aktif" ? "Aktif" : "Nonaktif"}</span>; }
function TableMessage({ message }: { message: string }) { return <tr><td colSpan={7} className="px-6 py-16 text-center text-[#71829a]">{message}</td></tr>; }
function ErrorState({ onRetry }: { onRetry: () => void }) { return <div className="px-6 py-16 text-center"><p className="font-semibold text-red-700">Data project gagal dimuat.</p><button type="button" onClick={onRetry} className="mt-4 rounded-xl bg-[#43a956] px-4 py-2 text-sm font-semibold text-white">Coba Lagi</button></div>; }
function formatStatus(status: string) { return status.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function formatDate(value: string | null) { if (!value) return "—"; const [year, month, day] = value.slice(0, 10).split("-").map(Number); return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(year, month - 1, day)); }
function validateProject(form: { project_manager_id: number; name: string; client_name: string; start_date: string; end_date: string }): LaravelFieldErrors { const errors: LaravelFieldErrors = {}; if (!form.project_manager_id) errors.project_manager_id = ["Project Manager wajib dipilih."]; if (!form.name.trim()) errors.name = ["Nama project wajib diisi."]; if (!form.client_name.trim()) errors.client_name = ["Client wajib diisi."]; if (!form.start_date) errors.start_date = ["Tanggal mulai wajib diisi."]; if (form.end_date && form.start_date && form.end_date < form.start_date) errors.end_date = ["Tanggal selesai tidak boleh sebelum tanggal mulai."]; return errors; }
function getErrorMessage(error: unknown, fallback: string) { if (!(error instanceof ApiError)) return "Tidak dapat terhubung ke server."; if (error.status === 403) return "Anda tidak memiliki izin untuk melakukan tindakan ini."; if (error.status === 404) return "Data project tidak ditemukan."; if (error.status >= 500) return "Server sedang bermasalah. Silakan coba lagi."; return error.message || fallback; }
