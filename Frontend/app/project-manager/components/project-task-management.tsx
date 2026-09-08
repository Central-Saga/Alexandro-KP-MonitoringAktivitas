"use client";

import { useEffect, useState } from "react";
import AdminDialog from "../../admin/components/admin-dialog";
import { AdminIcon } from "../../admin/components/admin-icons";
import { ApiError } from "../../lib/api-client";
import {
  firstFieldError,
  parseLaravelError,
  type LaravelFieldErrors,
} from "../../lib/validation";
import {
  createProjectTask,
  getProjectTasks,
  updateProjectTask,
  updateProjectTaskStatus,
  type ProjectTask,
  type ProjectTaskPayload,
  type ProjectTaskStatus,
} from "../../services/project-task-service";
import {
  getProjectAssignments,
  getProjects,
  type Project,
  type ProjectAssignment,
} from "../../services/project-service";
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
        const [projectItems, taskResponse] = await Promise.all([
          getProjects(),
          getProjectTasks({
            search: search || undefined,
            projectId,
            status: status || undefined,
            page,
            perPage: 10,
          }),
        ]);
        if (active) {
          setProjects(projectItems);
          setTasks(taskResponse.data);
          setMeta(taskResponse.meta);
        }
      } catch (requestError) {
        if (active) {
          setTasks([]);
          setMeta(null);
          setError(
            errorMessage(requestError, "Tugas karyawan gagal dimuat."),
          );
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

  function mutationSucceeded(message: string) {
    setDialog(null);
    setSuccess(message);
    setRequestVersion((value) => value + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          disabled={loading || projects.length === 0}
          onClick={() => setDialog({ type: "create" })}
          className="inline-flex items-center gap-2 rounded-xl bg-[#016273] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#014d5a] disabled:opacity-50"
        >
          <span className="text-xl leading-none" aria-hidden="true">
            +
          </span>
          Berikan Tugas
        </button>
      </div>

      {success && (
        <div
          role="status"
          className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <span>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Tutup pesan"
            className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100"
          >
            <AdminIcon name="x" className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#d0e6ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="grid gap-3 border-b border-[#d0e6ed] p-4 md:grid-cols-[minmax(0,1fr)_220px_180px] sm:p-6">
          <label className="relative block">
            <span className="sr-only">Cari tugas atau karyawan</span>
            <AdminIcon
              name="search"
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8399a2]"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari tugas atau karyawan..."
              className="h-11 w-full rounded-xl border border-[#c8dfe8] bg-white pl-12 pr-4 text-sm text-[#030303] outline-none placeholder:text-[#8399a2] focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
            />
          </label>
          <select
            aria-label="Filter proyek"
            value={projectId ?? ""}
            onChange={(event) => {
              setProjectId(
                event.target.value ? Number(event.target.value) : undefined,
              );
              setPage(1);
            }}
            className="h-11 rounded-xl border border-[#c8dfe8] bg-white px-3 text-sm text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
          >
            <option value="">Semua Proyek</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter status tugas"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as ProjectTaskStatus | "");
              setPage(1);
            }}
            className="h-11 rounded-xl border border-[#c8dfe8] bg-white px-3 text-sm text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
          >
            <option value="">Semua Status</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <ErrorState
            message={error}
            onRetry={() => setRequestVersion((value) => value + 1)}
          />
        ) : (
          <TaskTable
            tasks={tasks}
            loading={loading}
            onView={(task) => setDialog({ type: "view", task })}
            onEdit={(task) => setDialog({ type: "edit", task })}
            onStatus={(task, nextStatus) =>
              setDialog({ type: "status", task, status: nextStatus })
            }
          />
        )}

        <Pagination meta={meta} loading={loading} onPage={setPage} />
      </section>

      {dialog?.type === "create" && (
        <CreateTaskDialog
          projects={projects}
          onClose={() => setDialog(null)}
          onSuccess={mutationSucceeded}
        />
      )}
      {dialog?.type === "view" && (
        <ViewTaskDialog
          task={dialog.task}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.type === "edit" && (
        <EditTaskDialog
          task={dialog.task}
          onClose={() => setDialog(null)}
          onSuccess={mutationSucceeded}
        />
      )}
      {dialog?.type === "status" && (
        <StatusTaskDialog
          task={dialog.task}
          status={dialog.status}
          onClose={() => setDialog(null)}
          onSuccess={mutationSucceeded}
        />
      )}
    </div>
  );
}

function TaskTable({
  tasks,
  loading,
  onView,
  onEdit,
  onStatus,
}: {
  tasks: ProjectTask[];
  loading: boolean;
  onView: (task: ProjectTask) => void;
  onEdit: (task: ProjectTask) => void;
  onStatus: (task: ProjectTask, status: "completed" | "cancelled") => void;
}) {
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-left text-sm">
        <thead className="border-b border-[#d0e6ed] bg-[#EAF7FB] text-xs font-semibold uppercase tracking-wider text-[#030303]">
          <tr>
            <th className="px-5 py-3.5">Karyawan</th>
            <th className="px-4 py-3.5">Divisi</th>
            <th className="px-4 py-3.5">Proyek</th>
            <th className="px-4 py-3.5">Tugas</th>
            <th className="px-4 py-3.5">Deadline</th>
            <th className="px-4 py-3.5">Status</th>
            <th className="px-5 py-3.5 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#d0e6ed]">
          {loading ? (
            <TableMessage text="Memuat data tugas..." />
          ) : tasks.length === 0 ? (
            <TableMessage text="Belum ada tugas yang cocok dengan filter." />
          ) : (
            tasks.map((task) => (
              <tr
                key={task.id}
                className="transition-colors hover:bg-[#EAF7FB]/40 align-top"
              >
                {/* Karyawan */}
                <td className="px-5 py-4 font-semibold text-[#030303]">
                  {task.assignee.name}
                </td>

                {/* Divisi */}
                <td className="px-4 py-4 text-xs text-[#5a737e]">
                  {task.assignee.division?.name ?? "—"}
                </td>

                {/* Proyek */}
                <td className="px-4 py-4 font-medium text-[#030303]">
                  <span
                    className="block max-w-[180px] truncate"
                    title={task.project.name}
                  >
                    {task.project.name}
                  </span>
                </td>

                {/* Tugas */}
                <td className="px-4 py-4">
                  <p className="font-bold text-[#030303]">{task.title}</p>
                  <p
                    className="mt-0.5 line-clamp-1 max-w-xs text-xs text-[#5a737e]"
                    title={task.description || undefined}
                  >
                    {task.description || "Tanpa deskripsi"}
                  </p>
                </td>

                {/* Deadline */}
                <td className="px-4 py-4 whitespace-nowrap text-xs text-[#5a737e]">
                  {task.due_date ? formatDate(task.due_date) : "—"}
                </td>

                {/* Status */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <TaskStatusBadge status={task.status} />
                </td>

                {/* Aksi */}
                <td className="px-5 py-4 whitespace-nowrap text-center">
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    <IconButton
                      icon="eye"
                      label={`Lihat detail ${task.title}`}
                      onClick={() => onView(task)}
                    />
                    {task.status === "active" && (
                      <>
                        <IconButton
                          icon="edit"
                          label={`Ubah tugas ${task.title}`}
                          onClick={() => onEdit(task)}
                        />
                        <button
                          type="button"
                          onClick={() => onStatus(task, "completed")}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                        >
                          Selesaikan
                        </button>
                        <button
                          type="button"
                          onClick={() => onStatus(task, "cancelled")}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                        >
                          Batalkan
                        </button>
                      </>
                    )}
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

function CreateTaskDialog({
  projects,
  onClose,
  onSuccess,
}: {
  projects: Project[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [form, setForm] = useState<ProjectTaskPayload>({
    project_id: 0,
    assigned_to: 0,
    title: "",
    description: null,
    due_date: null,
  });
  const [assignments, setAssignments] = useState<ProjectAssignment[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidateError, setCandidateError] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<LaravelFieldErrors>({});
  const [message, setMessage] = useState("");

  async function selectProject(value: string) {
    const id = value ? Number(value) : 0;
    setForm((current) => ({ ...current, project_id: id, assigned_to: 0 }));
    setAssignments([]);
    setCandidateError("");
    if (!id) return;
    setLoadingCandidates(true);
    try {
      const response = await getProjectAssignments(id);
      setAssignments(
        response.data.filter(
          (assignment) =>
            assignment.status === "aktif" && assignment.user.is_active,
        ),
      );
    } catch (requestError) {
      setCandidateError(
        errorMessage(requestError, "Anggota aktif gagal dimuat."),
      );
    } finally {
      setLoadingCandidates(false);
    }
  }

  function change<K extends keyof ProjectTaskPayload>(
    field: K,
    value: ProjectTaskPayload[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: [] }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setErrors({});
    if (!form.project_id || !form.assigned_to || !form.title.trim()) {
      setMessage("Proyek, karyawan, dan judul tugas wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const response = await createProjectTask({
        ...form,
        title: form.title.trim(),
        description: form.description?.trim() || null,
      });
      onSuccess(response.message);
    } catch (requestError) {
      setErrors(
        parseLaravelError(
          requestError instanceof ApiError ? requestError.data : null,
        ).errors ?? {},
      );
      setMessage(errorMessage(requestError, "Tugas gagal diberikan."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminDialog title="Berikan Tugas Karyawan" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
        <Field label="Proyek" error={firstFieldError(errors, "project_id")}>
          <select
            value={form.project_id || ""}
            onChange={(event) => void selectProject(event.target.value)}
            className="h-11 w-full rounded-xl border border-[#c8dfe8] bg-white px-3 text-sm text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
          >
            <option value="">Pilih Proyek</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Karyawan" error={firstFieldError(errors, "assigned_to")}>
          <select
            value={form.assigned_to || ""}
            disabled={!form.project_id || loadingCandidates}
            onChange={(event) =>
              change("assigned_to", Number(event.target.value))
            }
            className="h-11 w-full rounded-xl border border-[#c8dfe8] bg-white px-3 text-sm text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20 disabled:bg-slate-50"
          >
            <option value="">
              {loadingCandidates
                ? "Memuat anggota..."
                : "Pilih anggota aktif proyek"}
            </option>
            {assignments.map((assignment) => (
              <option key={assignment.id} value={assignment.user.id}>
                {assignment.user.name} —{" "}
                {assignment.user.division?.name ?? "Tanpa divisi"}
              </option>
            ))}
          </select>
        </Field>

        {candidateError && (
          <p role="alert" className="text-xs text-red-600">
            {candidateError}
          </p>
        )}

        {!loadingCandidates &&
          form.project_id > 0 &&
          !candidateError &&
          assignments.length === 0 && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Belum ada anggota aktif pada proyek ini. Tugaskan anggota terlebih
              dahulu.
            </p>
          )}

        <Field label="Judul Tugas" error={firstFieldError(errors, "title")}>
          <input
            value={form.title}
            maxLength={255}
            placeholder="Contoh: Selesaikan modul pembayaran"
            onChange={(event) => change("title", event.target.value)}
            className="h-11 w-full rounded-xl border border-[#c8dfe8] px-3.5 text-sm text-[#030303] outline-none placeholder:text-[#8399a2] focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
          />
        </Field>

        <Field label="Deskripsi" error={firstFieldError(errors, "description")}>
          <textarea
            rows={3}
            value={form.description ?? ""}
            placeholder="Rincian tugas atau instruksi pengerjaan..."
            onChange={(event) => change("description", event.target.value)}
            className="w-full rounded-xl border border-[#c8dfe8] p-3 text-sm text-[#030303] outline-none placeholder:text-[#8399a2] focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
          />
        </Field>

        <Field
          label="Deadline (opsional)"
          error={firstFieldError(errors, "due_date")}
        >
          <input
            type="date"
            value={form.due_date ?? ""}
            onChange={(event) => change("due_date", event.target.value || null)}
            className="h-11 w-full rounded-xl border border-[#c8dfe8] px-3.5 text-sm text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
          />
        </Field>

        {message && (
          <p role="alert" className="text-xs text-red-600">
            {message}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-[#d0e6ed] pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-[#d0e6ed] px-4 py-2 text-xs font-semibold text-[#5a737e] hover:bg-[#EAF7FB] disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving || !form.project_id || !form.assigned_to}
            className="rounded-xl bg-[#016273] px-5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#014d5a] disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Berikan Tugas"}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}

function ViewTaskDialog({
  task,
  onClose,
}: {
  task: ProjectTask;
  onClose: () => void;
}) {
  return (
    <AdminDialog title="Detail Tugas Karyawan" onClose={onClose}>
      <div className="p-5 sm:p-6">
        <dl className="grid gap-4 text-xs sm:grid-cols-2">
          <Detail label="Karyawan" value={task.assignee.name} />
          <Detail
            label="Divisi"
            value={task.assignee.division?.name ?? "—"}
          />
          <Detail label="Proyek" value={task.project.name} />
          <Detail
            label="Deadline"
            value={task.due_date ? formatDate(task.due_date) : "—"}
          />
          <div>
            <dt className="text-xs font-semibold text-[#5a737e]">Status</dt>
            <dd className="mt-1">
              <TaskStatusBadge status={task.status} />
            </dd>
          </div>
          <Detail label="Dibuat oleh" value={task.created_by.name} />
          <div className="sm:col-span-2">
            <Detail label="Judul Tugas" value={task.title} />
          </div>
          <div className="sm:col-span-2">
            <Detail
              label="Deskripsi"
              value={task.description || "Tidak ada deskripsi."}
            />
          </div>
        </dl>
        <div className="mt-6 flex justify-end border-t border-[#d0e6ed] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#d0e6ed] px-4 py-2 text-xs font-semibold text-[#5a737e] hover:bg-[#EAF7FB]"
          >
            Tutup
          </button>
        </div>
      </div>
    </AdminDialog>
  );
}

function EditTaskDialog({
  task,
  onClose,
  onSuccess,
}: {
  task: ProjectTask;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!title.trim()) {
      setMessage("Judul Tugas wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const response = await updateProjectTask(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
      });
      onSuccess(response.message);
    } catch (requestError) {
      setMessage(errorMessage(requestError, "Tugas gagal diperbarui."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminDialog title="Ubah Tugas Karyawan" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
        <div className="rounded-xl border border-[#d0e6ed] bg-[#EAF7FB]/40 p-3 text-xs">
          <p className="font-bold text-[#030303]">
            {task.assignee.name}
          </p>
          <p className="mt-0.5 text-[#5a737e]">
            {task.project.name} ·{" "}
            {task.assignee.division?.name ?? "Tanpa divisi"}
          </p>
        </div>

        <Field label="Judul Tugas">
          <input
            value={title}
            maxLength={255}
            onChange={(event) => setTitle(event.target.value)}
            className="h-11 w-full rounded-xl border border-[#c8dfe8] px-3.5 text-sm text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
          />
        </Field>

        <Field label="Deskripsi">
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-full rounded-xl border border-[#c8dfe8] p-3 text-sm text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
          />
        </Field>

        <Field label="Deadline">
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
            className="h-11 w-full rounded-xl border border-[#c8dfe8] px-3.5 text-sm text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
          />
        </Field>

        {message && (
          <p role="alert" className="text-xs text-red-600">
            {message}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-[#d0e6ed] pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-[#d0e6ed] px-4 py-2 text-xs font-semibold text-[#5a737e] hover:bg-[#EAF7FB] disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[#016273] px-5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#014d5a] disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}

function StatusTaskDialog({
  task,
  status,
  onClose,
  onSuccess,
}: {
  task: ProjectTask;
  status: "completed" | "cancelled";
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const completing = status === "completed";

  async function confirm() {
    setSaving(true);
    setMessage("");
    try {
      const response = await updateProjectTaskStatus(task.id, status);
      onSuccess(response.message);
    } catch (requestError) {
      setMessage(
        errorMessage(requestError, "Status tugas gagal diperbarui."),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminDialog
      title={completing ? "Selesaikan Tugas" : "Batalkan Tugas"}
      onClose={onClose}
    >
      <div className="space-y-4 p-5 sm:p-6">
        <p className="text-sm font-bold text-[#030303]">
          {completing
            ? "Tandai tugas ini sebagai selesai?"
            : "Batalkan tugas ini?"}
        </p>
        <p className="text-xs leading-relaxed text-[#5a737e] sm:text-sm">
          Tugas <strong>{task.title}</strong> akan berstatus final (
          {statusLabels[status]}) dan tidak dapat lagi dipilih untuk entri
          aktivitas baru.
        </p>
        {message && (
          <p role="alert" className="text-xs text-red-600">
            {message}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-[#d0e6ed] pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-[#d0e6ed] px-4 py-2 text-xs font-semibold text-[#5a737e] hover:bg-[#EAF7FB]"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={saving}
            className={`rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-50 ${
              completing
                ? "bg-[#016273] hover:bg-[#014d5a]"
                : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {saving
              ? "Memproses..."
              : completing
                ? "Selesaikan Tugas"
                : "Batalkan Tugas"}
          </button>
        </div>
      </div>
    </AdminDialog>
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
        <span className="rounded-lg bg-[#016273] px-3 py-1.5 text-xs font-bold text-white">
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

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-semibold text-[#030303]">
      {label}
      <span className="mt-1.5 block font-normal">{children}</span>
      {error && (
        <span className="mt-1 block text-xs font-normal text-red-600">
          {error}
        </span>
      )}
    </label>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-[#5a737e]">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-wrap font-medium text-[#030303]">
        {value}
      </dd>
    </div>
  );
}

function TaskStatusBadge({ status }: { status: ProjectTaskStatus }) {
  const tone =
    status === "active"
      ? "bg-[#EAF7FB] text-[#016273] ring-1 ring-inset ring-[#016273]/20"
      : status === "completed"
        ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
        : "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function IconButton({
  icon,
  label,
  onClick,
}: {
  icon: "eye" | "edit";
  label: string;
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

function TableMessage({ text }: { text: string }) {
  return (
    <tr>
      <td colSpan={7} className="px-6 py-16 text-center text-sm text-[#5a737e]">
        {text}
      </td>
    </tr>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="px-6 py-16 text-center">
      <p role="alert" className="font-semibold text-red-700">
        {message}
      </p>
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

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function errorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError))
    return "Tidak dapat terhubung ke server.";
  if (error.status === 403)
    return "Anda tidak memiliki akses ke tugas ini.";
  if (error.status === 422) return error.message || fallback;
  if (error.status >= 500)
    return "Server sedang bermasalah. Silakan coba lagi.";
  return error.message || fallback;
}
