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
          <h1 className="text-2xl font-bold text-[#030303]">Manajemen Proyek</h1>
          <p className="mt-1 text-sm text-[#5a737e]">
            {projectsState.error || projectsState.isLoading ? "Kelola project dan penugasan anggota" : `${projectsState.data.length} project terdaftar`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialog({ type: "create" })}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#016273] px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#014d5a]"
        >
          <span aria-hidden="true" className="text-xl leading-none">+</span> Tambah Proyek
        </button>
      </header>

      {successMessage && (
        <div role="status" className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span>{successMessage}</span>
          <button type="button" aria-label="Tutup pesan" onClick={() => setSuccessMessage("")}><AdminIcon name="x" className="h-4 w-4" /></button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#d0e6ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="grid gap-3 border-b border-[#d0e6ed] p-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:p-6">
          <label className="relative">
            <span className="sr-only">Cari project</span>
            <AdminIcon name="search" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8399a2]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama proyek, client, atau Project Manager..."
              className="h-12 w-full rounded-xl border border-[#c8dfe8] pl-12 pr-4 text-sm text-[#030303] outline-none placeholder:text-[#8399a2] focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
            />
          </label>
          <label>
            <span className="sr-only">Filter status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-12 w-full rounded-xl border border-[#c8dfe8] bg-white px-4 text-sm text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
            >
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

const PROJECT_STATUS_OPTIONS = [
  { value: "perencanaan", label: "Perencanaan" },
  { value: "berlangsung", label: "Berlangsung" },
  { value: "selesai", label: "Selesai" },
  { value: "ditunda", label: "Ditunda" },
  { value: "dibatalkan", label: "Dibatalkan" },
];

function ProjectTable({
  projects,
  isLoading,
  onView,
  onEdit,
  onMembers,
}: {
  projects: Project[];
  isLoading: boolean;
  onView: (project: Project) => void;
  onEdit: (project: Project) => void;
  onMembers: (project: Project) => void;
}) {
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm">
        <thead className="bg-[#EAF7FB] text-[#030303]">
          <tr>
            <th className="px-5 py-3 font-semibold">Proyek</th>
            <th className="px-5 py-3 font-semibold">Nama Klien</th>
            <th className="px-5 py-3 font-semibold">Project Manager</th>
            <th className="px-5 py-3 font-semibold">Periode</th>
            <th className="px-5 py-3 font-semibold">Anggota Aktif</th>
            <th className="px-5 py-3 font-semibold">Status</th>
            <th className="px-5 py-3 text-center font-semibold">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <TableMessage message="Memuat data proyek..." />
          ) : projects.length === 0 ? (
            <TableMessage message="Belum ada proyek yang cocok dengan pencarian atau filter." />
          ) : (
            projects.map((project) => (
              <tr
                key={project.id}
                className="border-b border-[#d0e6ed] last:border-0 hover:bg-[#EAF7FB]/40 transition-colors"
              >
                <td className="px-5 py-4">
                  <p className="font-semibold text-[#030303]">{project.name}</p>
                </td>
                <td className="px-5 py-4 text-[#5a737e]">{project.client_name || "—"}</td>
                <td className="px-5 py-4 text-[#5a737e]">
                  {project.project_manager?.name ?? "—"}
                </td>
                <td className="px-5 py-4 text-[#5a737e]">
                  {formatDate(project.start_date)} – {formatDate(project.end_date)}
                </td>
                <td className="px-5 py-4 font-semibold text-[#030303]">
                  {project.active_assignments_count}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={project.status} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-center gap-2">
                    <ActionButton
                      label="Lihat detail"
                      icon="eye"
                      onClick={() => onView(project)}
                    />
                    <ActionButton
                      label="Edit proyek"
                      icon="edit"
                      onClick={() => onEdit(project)}
                    />
                    <ActionButton
                      label="Kelola anggota"
                      icon="users"
                      onClick={() => onMembers(project)}
                    />
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ProjectFormDialog({
  mode,
  projectId,
  onClose,
  onSuccess,
}: {
  mode: "create" | "edit";
  projectId?: number;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [form, setForm] = useState({
    project_manager_id: 0,
    name: "",
    client_name: "",
    start_date: "",
    end_date: "",
    status: mode === "create" ? "berlangsung" : "",
  });
  const [managers, setManagers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<LaravelFieldErrors>({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const managerRequest = getUsers({
      role: "project_manager",
      status: "active",
      page: 1,
      perPage: 100,
    });
    const projectRequest =
      mode === "edit" && projectId ? getProject(projectId) : Promise.resolve(null);

    void Promise.all([managerRequest, projectRequest])
      .then(([users, projectResponse]) => {
        if (!active) return;
        setManagers(users.data);
        if (projectResponse) {
          const project = projectResponse.data;
          setForm({
            project_manager_id: project.project_manager_id,
            name: project.name,
            client_name: project.client_name,
            start_date: project.start_date,
            end_date: project.end_date ?? "",
            status: project.status,
          });
        } else if (users.data[0]) {
          setForm((current) => ({
            ...current,
            project_manager_id: users.data[0].id,
          }));
        }
      })
      .catch((error) =>
        setMessage(getErrorMessage(error, "Form proyek gagal dimuat.")),
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
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
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      return;
    }
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
      const response =
        mode === "create"
          ? await createProject(payload)
          : await updateProject(projectId!, payload);
      onSuccess(response.message);
    } catch (error) {
      setErrors(
        parseLaravelError(error instanceof ApiError ? error.data : null)
          .errors ?? {},
      );
      setMessage(getErrorMessage(error, "Proyek gagal disimpan."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminDialog
        title={mode === "create" ? "Tambah Proyek" : "Edit Proyek"}
        maxWidth="max-w-2xl sm:max-w-3xl lg:max-w-[880px]"
        onClose={onClose}
      >
        <div className="p-8 text-center text-sm text-[#71829a]">
          Memuat data proyek...
        </div>
      </AdminDialog>
    );
  }

  return (
    <AdminDialog
      title={mode === "create" ? "Tambah Proyek" : "Edit Proyek"}
      maxWidth="max-w-2xl sm:max-w-3xl lg:max-w-[880px]"
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
        {message && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700"
          >
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Row 1: Nama Proyek & Nama Klien */}
          <Field
            id="project-name"
            label="Nama Proyek"
            placeholder="Contoh: Sistem Monitoring Aktivitas"
            value={form.name}
            error={firstFieldError(errors, "name")}
            onChange={(value) => change("name", value)}
          />
          <Field
            id="project-client"
            label="Nama Klien"
            placeholder="Contoh: PT Citra Mandiri"
            value={form.client_name}
            error={firstFieldError(errors, "client_name")}
            onChange={(value) => change("client_name", value)}
          />

          {/* Row 2: Project Manager (Full Width) */}
          <label
            htmlFor="project-manager-select"
            className="block text-sm font-semibold text-[#030303] sm:col-span-2"
          >
            Project Manager
            <select
              id="project-manager-select"
              required
              value={form.project_manager_id || ""}
              onChange={(event) =>
                change("project_manager_id", Number(event.target.value))
              }
              aria-invalid={Boolean(firstFieldError(errors, "project_manager_id"))}
              className="mt-1.5 h-11 w-full rounded-xl border border-[#c8dfe8] bg-white px-3 text-sm font-normal text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
            >
              <option value="" disabled>
                Pilih Project Manager
              </option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                  {manager.division ? ` — Divisi ${manager.division.name}` : ""}
                </option>
              ))}
              {managers.every((m) => m.id !== form.project_manager_id) &&
                form.project_manager_id > 0 && (
                  <option value={form.project_manager_id}>
                    Project Manager saat ini (ID: {form.project_manager_id})
                  </option>
                )}
            </select>
            {firstFieldError(errors, "project_manager_id") && (
              <span className="mt-1 block text-xs font-normal text-red-600">
                {firstFieldError(errors, "project_manager_id")}
              </span>
            )}
            {managers.length === 0 && (
              <span className="mt-1 block text-xs font-normal text-amber-700">
                Tidak ada Project Manager aktif yang tersedia.
              </span>
            )}
          </label>

          {/* Row 3: Tanggal Mulai & Tanggal Selesai */}
          <Field
            id="project-start"
            label="Tanggal Mulai"
            type="date"
            value={form.start_date}
            error={firstFieldError(errors, "start_date")}
            onChange={(value) => change("start_date", value)}
          />
          <Field
            id="project-end"
            label="Tanggal Selesai"
            type="date"
            required={false}
            value={form.end_date}
            error={firstFieldError(errors, "end_date")}
            onChange={(value) => change("end_date", value)}
          />

          {/* Row 4: Status (Dropdown) */}
          <label
            htmlFor="project-status-select"
            className="block text-sm font-semibold text-[#030303] sm:col-span-2"
          >
            Status
            <select
              id="project-status-select"
              value={form.status}
              onChange={(event) => change("status", event.target.value)}
              aria-invalid={Boolean(firstFieldError(errors, "status"))}
              className="mt-1.5 h-11 w-full rounded-xl border border-[#c8dfe8] bg-white px-3 text-sm font-normal text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
            >
              <option value="" disabled>
                Pilih Status Proyek
              </option>
              {PROJECT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
              {form.status &&
                !PROJECT_STATUS_OPTIONS.some((opt) => opt.value === form.status) && (
                  <option value={form.status}>{formatStatus(form.status)}</option>
                )}
            </select>
            {firstFieldError(errors, "status") && (
              <span className="mt-1 block text-xs font-normal text-red-600">
                {firstFieldError(errors, "status")}
              </span>
            )}
          </label>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2.5 border-t border-[#d0e6ed] pt-4">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-xl border border-[#d0e6ed] bg-white px-4 py-2.5 text-sm font-semibold text-[#5a737e] hover:bg-[#EAF7FB] disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving || (mode === "create" && managers.length === 0)}
            className="rounded-xl bg-[#016273] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#014d5a] focus:outline-none focus:ring-2 focus:ring-[#016273]/30 disabled:opacity-50"
          >
            {saving
              ? "Menyimpan..."
              : mode === "create"
                ? "Tambah Proyek"
                : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}

function ProjectDetailDialog({ projectId, onClose }: { projectId: number; onClose: () => void }) {
  const [project, setProject] = useState<Project | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    void getProject(projectId)
      .then((response) => {
        if (active) setProject(response.data);
      })
      .catch((error) => {
        if (active) setMessage(getErrorMessage(error, "Detail proyek gagal dimuat."));
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  return (
    <AdminDialog title="Detail Proyek" onClose={onClose}>
      <div className="p-5 sm:p-6">
        {message ? (
          <p role="alert" className="text-sm text-red-600">
            {message}
          </p>
        ) : !project ? (
          <p className="text-sm text-[#71829a]">Memuat detail proyek...</p>
        ) : (
          <dl className="grid gap-5 sm:grid-cols-2">
            <Detail label="Nama Proyek" value={project.name} />
            <Detail label="Nama Klien" value={project.client_name || "—"} />
            <Detail label="Project Manager" value={project.project_manager?.name ?? "—"} />
            <Detail label="Status" value={formatStatus(project.status)} />
            <Detail label="Tanggal Mulai" value={formatDate(project.start_date)} />
            <Detail label="Tanggal Selesai" value={formatDate(project.end_date)} />
            <Detail label="Anggota Aktif" value={String(project.active_assignments_count)} />
            <Detail label="Progress" value="Belum tersedia dari backend" />
          </dl>
        )}
      </div>
    </AdminDialog>
  );
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
        <form onSubmit={addMember} className="grid gap-3 rounded-xl border border-[#d0e6ed] bg-[#EAF7FB]/40 p-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[#030303] sm:col-span-2">
            Karyawan
            <select
              required
              value={userId || ""}
              onChange={(event) => setUserId(Number(event.target.value))}
              className="mt-2 h-11 w-full rounded-xl border border-[#c8dfe8] bg-white px-3 font-normal text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
            >
              <option value="" disabled>Pilih Karyawan aktif</option>
              {availableCandidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}{candidate.division ? ` — ${candidate.division.name}` : ""}
                </option>
              ))}
            </select>
            {firstFieldError(errors, "user_id") && (
              <span className="mt-1 block text-xs font-normal text-red-600">{firstFieldError(errors, "user_id")}</span>
            )}
          </label>
          <Field id="assignment-role" label="Peran di Proyek" value={projectRole} error={firstFieldError(errors, "project_role")} onChange={setProjectRole} />
          <Field id="assignment-start" label="Tanggal Mulai" type="date" value={startDate} error={firstFieldError(errors, "start_date")} onChange={setStartDate} />
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving || availableCandidates.length === 0}
              className="rounded-xl bg-[#016273] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#014d5a] disabled:opacity-50"
            >
              {saving ? "Memproses..." : "Tambah Anggota"}
            </button>
          </div>
          {availableCandidates.length === 0 && (
            <p className="text-xs text-[#5a737e] sm:col-span-2">Tidak ada Karyawan aktif lain yang dapat ditambahkan.</p>
          )}
        </form>
        {message && <p role="status" className="text-sm text-[#5a737e]">{message}</p>}
        {loading ? (
          <p className="py-8 text-center text-sm text-[#5a737e]">Memuat anggota...</p>
        ) : assignments.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#5a737e]">Belum ada anggota pada project ini.</p>
        ) : (
          <div className="divide-y divide-[#d0e6ed]">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-[#030303]">{assignment.user.name}</p>
                  <p className="mt-1 text-xs text-[#5a737e]">
                    {assignment.project_role} · {assignment.user.division?.name ?? "Tanpa divisi"} · mulai {formatDate(assignment.start_date)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <AssignmentBadge status={assignment.status} />
                  <button
                    type="button"
                    disabled={saving || (!assignment.user.is_active && assignment.status !== "aktif")}
                    onClick={() => void toggleAssignment(assignment)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-40 ${
                      assignment.status === "aktif"
                        ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                        : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    }`}
                  >
                    {assignment.status === "aktif" ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs leading-5 text-[#5a737e]">
          Assignment dinonaktifkan, bukan dihapus, agar histori project tetap dapat diaudit. Backend tetap memvalidasi role dan status akun saat penambahan.
        </p>
      </div>
    </AdminDialog>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  required = true,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label htmlFor={id} className="block text-sm font-semibold text-[#030303]">
      {label}
      <input
        id={id}
        type={type}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className="mt-1.5 h-11 w-full rounded-xl border border-[#c8dfe8] bg-white px-3 text-sm font-normal text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
      />
      {error && (
        <span className="mt-1 block text-xs font-normal text-red-600">{error}</span>
      )}
    </label>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-[#5a737e]">{label}</dt>
      <dd className="mt-1 font-medium text-[#030303]">{value}</dd>
    </div>
  );
}
function ActionButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: "eye" | "edit" | "users";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded-lg border border-[#d0e6ed] p-2 text-[#5a737e] transition-colors hover:bg-[#EAF7FB] hover:text-[#016273]"
    >
      <AdminIcon name={icon} className="h-4 w-4" />
    </button>
  );
}
function StatusBadge({ status }: { status: string }) {
  const tones: Record<string, string> = {
    selesai: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
    berlangsung: "bg-[#EAF7FB] text-[#016273] ring-1 ring-inset ring-[#016273]/20",
    perencanaan: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20",
    ditunda: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
    dibatalkan: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
  };
  const tone = tones[status.toLowerCase()] || "bg-slate-100 text-slate-700";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      {formatStatus(status)}
    </span>
  );
}
function AssignmentBadge({ status }: { status: ProjectAssignment["status"] }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        status === "aktif"
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {status === "aktif" ? "Aktif" : "Nonaktif"}
    </span>
  );
}
function TableMessage({ message }: { message: string }) {
  return (
    <tr>
      <td colSpan={7} className="px-6 py-16 text-center text-[#5a737e]">
        {message}
      </td>
    </tr>
  );
}
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="px-6 py-16 text-center">
      <p className="font-semibold text-red-700">Data proyek gagal dimuat.</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-xl bg-[#016273] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#014d5a]"
      >
        Coba Lagi
      </button>
    </div>
  );
}
function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function formatDate(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}
function validateProject(form: {
  project_manager_id: number;
  name: string;
  client_name: string;
  start_date: string;
  end_date: string;
}): LaravelFieldErrors {
  const errors: LaravelFieldErrors = {};
  if (!form.project_manager_id)
    errors.project_manager_id = ["Project Manager wajib dipilih."];
  if (!form.name.trim()) errors.name = ["Nama proyek wajib diisi."];
  if (!form.client_name.trim()) errors.client_name = ["Nama klien wajib diisi."];
  if (!form.start_date) errors.start_date = ["Tanggal mulai wajib diisi."];
  if (form.end_date && form.start_date && form.end_date < form.start_date)
    errors.end_date = ["Tanggal selesai tidak boleh sebelum tanggal mulai."];
  return errors;
}
function getErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return "Tidak dapat terhubung ke server.";
  if (error.status === 403)
    return "Anda tidak memiliki izin untuk melakukan tindakan ini.";
  if (error.status === 404) return "Data proyek tidak ditemukan.";
  if (error.status >= 500)
    return "Server sedang bermasalah. Silakan coba lagi.";
  return error.message || fallback;
}
