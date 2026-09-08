"use client";

import { useEffect, useMemo, useState } from "react";
import AdminDialog from "../../admin/components/admin-dialog";
import { AdminIcon } from "../../admin/components/admin-icons";
import { ApiError } from "../../lib/api-client";
import {
  firstFieldError,
  parseLaravelError,
  type LaravelFieldErrors,
} from "../../lib/validation";
import {
  createProjectAssignment,
  getProjectAssignmentCandidates,
  getProjectAssignments,
  getProjects,
  updateProjectAssignment,
  type Project,
  type ProjectAssignment,
  type ProjectAssignmentCandidate,
} from "../../services/project-service";

type AssignmentRow = { project: Project; assignment: ProjectAssignment };
type DialogState =
  | { type: "create" }
  | { type: "edit" | "toggle"; row: AssignmentRow }
  | null;

export default function ProjectAssignments() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState<ProjectAssignment["status"] | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [success, setSuccess] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const projectItems = await getProjects();
        // Endpoint assignment scoped per project for current Project Manager
        const responses = await Promise.all(
          projectItems.map((project) => getProjectAssignments(project.id)),
        );
        if (!active) return;
        setProjects(projectItems);
        setRows(
          projectItems.flatMap((project, index) =>
            responses[index].data.map((assignment) => ({
              project,
              assignment,
            })),
          ),
        );
      } catch (requestError) {
        if (active) {
          setProjects([]);
          setRows([]);
          setError(
            errorMessage(requestError, "Penugasan proyek gagal dimuat."),
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
  }, [requestVersion]);

  const visibleRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("id-ID");
    return rows.filter(({ project, assignment }) => {
      const matchesSearch =
        !term ||
        [assignment.user.name, project.name, assignment.project_role].some(
          (value) => value.toLocaleLowerCase("id-ID").includes(term),
        );
      return (
        matchesSearch &&
        (!projectId || project.id === Number(projectId)) &&
        (!status || assignment.status === status)
      );
    });
  }, [projectId, rows, search, status]);

  function mutationSucceeded(message: string) {
    setDialog(null);
    setSuccess(message);
    setRequestVersion((value) => value + 1);
  }

  const hasFilters = Boolean(search.trim() || projectId || status);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          disabled={loading || projects.length === 0}
          onClick={() => setDialog({ type: "create" })}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#016273] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#014d5a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-hidden="true" className="text-xl leading-none">
            +
          </span>
          Tugaskan Karyawan
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
            aria-label="Tutup pesan"
            onClick={() => setSuccess("")}
            className="rounded-lg p-1 text-emerald-700 hover:bg-emerald-100"
          >
            <AdminIcon name="x" className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#d0e6ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="grid gap-3 border-b border-[#d0e6ed] p-4 md:grid-cols-[minmax(0,1fr)_220px_180px] sm:p-6">
          <label className="relative block">
            <span className="sr-only">Cari karyawan, proyek, atau peran</span>
            <AdminIcon
              name="search"
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8399a2]"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari karyawan atau proyek..."
              className="h-11 w-full rounded-xl border border-[#c8dfe8] bg-white pl-12 pr-4 text-sm text-[#030303] outline-none placeholder:text-[#8399a2] focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
            />
          </label>
          <label className="block">
            <span className="sr-only">Filter proyek</span>
            <select
              value={projectId}
              disabled={projects.length === 0}
              onChange={(event) => setProjectId(event.target.value)}
              className="h-11 w-full rounded-xl border border-[#c8dfe8] bg-white px-3 text-sm text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20 disabled:bg-slate-50"
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
            <span className="sr-only">Filter status penugasan</span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as ProjectAssignment["status"] | "")
              }
              className="h-11 w-full rounded-xl border border-[#c8dfe8] bg-white px-3 text-sm text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
            >
              <option value="">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
          </label>
        </div>

        {error ? (
          <ErrorState
            message={error}
            onRetry={() => setRequestVersion((value) => value + 1)}
          />
        ) : (
          <AssignmentTable
            rows={visibleRows}
            loading={loading}
            hasFilters={hasFilters}
            onEdit={(row) => setDialog({ type: "edit", row })}
            onToggle={(row) => setDialog({ type: "toggle", row })}
          />
        )}
      </section>

      {dialog?.type === "create" && (
        <CreateAssignmentDialog
          projects={projects}
          onClose={() => setDialog(null)}
          onSuccess={mutationSucceeded}
        />
      )}
      {dialog?.type === "edit" && (
        <EditAssignmentDialog
          row={dialog.row}
          onClose={() => setDialog(null)}
          onSuccess={mutationSucceeded}
        />
      )}
      {dialog?.type === "toggle" && (
        <ToggleAssignmentDialog
          row={dialog.row}
          onClose={() => setDialog(null)}
          onSuccess={mutationSucceeded}
        />
      )}
    </div>
  );
}

function AssignmentTable({
  rows,
  loading,
  hasFilters,
  onEdit,
  onToggle,
}: {
  rows: AssignmentRow[];
  loading: boolean;
  hasFilters: boolean;
  onEdit: (row: AssignmentRow) => void;
  onToggle: (row: AssignmentRow) => void;
}) {
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-[880px] border-collapse text-left text-sm">
        <thead className="border-b border-[#d0e6ed] bg-[#EAF7FB] text-xs font-semibold uppercase tracking-wider text-[#030303]">
          <tr>
            <th className="px-5 py-3.5">Karyawan</th>
            <th className="px-4 py-3.5">Divisi</th>
            <th className="px-4 py-3.5">Proyek</th>
            <th className="px-4 py-3.5">Peran dalam Proyek</th>
            <th className="px-4 py-3.5">Tanggal Mulai</th>
            <th className="px-4 py-3.5">Status</th>
            <th className="px-5 py-3.5 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#d0e6ed]">
          {loading ? (
            <TableMessage text="Memuat data penugasan..." />
          ) : rows.length === 0 ? (
            <TableMessage
              text={
                hasFilters
                  ? "Tidak ada penugasan yang cocok dengan pencarian atau filter."
                  : "Belum ada penugasan pada proyek yang Anda kelola."
              }
            />
          ) : (
            rows.map((row) => (
              <tr
                key={row.assignment.id}
                className="transition-colors hover:bg-[#EAF7FB]/40"
              >
                {/* Karyawan */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#016273] text-xs font-bold text-white shadow-xs">
                      {initials(row.assignment.user.name)}
                    </span>
                    <span className="truncate font-semibold text-[#030303]">
                      {row.assignment.user.name}
                    </span>
                  </div>
                </td>

                {/* Divisi */}
                <td className="px-4 py-4 text-xs font-medium text-[#5a737e]">
                  {row.assignment.user.division?.name ?? "—"}
                </td>

                {/* Proyek */}
                <td className="px-4 py-4">
                  <span
                    className="block max-w-[200px] truncate font-medium text-[#030303]"
                    title={row.project.name}
                  >
                    {row.project.name}
                  </span>
                </td>

                {/* Peran dalam Proyek */}
                <td className="px-4 py-4">
                  <span
                    className="block max-w-[180px] truncate text-xs text-[#5a737e]"
                    title={row.assignment.project_role || "—"}
                  >
                    {row.assignment.project_role || "—"}
                  </span>
                </td>

                {/* Tanggal Mulai */}
                <td className="px-4 py-4 whitespace-nowrap text-xs text-[#5a737e]">
                  {formatDate(row.assignment.start_date)}
                </td>

                {/* Status */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <StatusBadge status={row.assignment.status} />
                </td>

                {/* Aksi */}
                <td className="px-5 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <IconButton
                      icon="edit"
                      title="Ubah penugasan"
                      label={`Ubah penugasan ${row.assignment.user.name} pada ${row.project.name}`}
                      onClick={() => onEdit(row)}
                    />
                    <IconButton
                      icon={
                        row.assignment.status === "aktif"
                          ? "user-minus"
                          : "user-check"
                      }
                      title={
                        row.assignment.status === "aktif"
                          ? "Nonaktifkan"
                          : "Aktifkan kembali"
                      }
                      label={`${
                        row.assignment.status === "aktif"
                          ? "Nonaktifkan"
                          : "Aktifkan kembali"
                      } penugasan ${row.assignment.user.name} pada ${
                        row.project.name
                      }`}
                      tone={row.assignment.status === "aktif" ? "red" : "green"}
                      onClick={() => onToggle(row)}
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

function CreateAssignmentDialog({
  projects,
  onClose,
  onSuccess,
}: {
  projects: Project[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [projectId, setProjectId] = useState("");
  const [candidates, setCandidates] = useState<ProjectAssignmentCandidate[]>([]);
  const [candidateId, setCandidateId] = useState("");
  const [projectRole, setProjectRole] = useState("");
  const [startDate, setStartDate] = useState(localDateKey(new Date()));
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidateError, setCandidateError] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<LaravelFieldErrors>({});
  const [message, setMessage] = useState("");

  async function selectProject(value: string) {
    setProjectId(value);
    setCandidateId("");
    setCandidates([]);
    setCandidateError("");
    setMessage("");
    if (!value) return;
    setLoadingCandidates(true);
    try {
      const response = await getProjectAssignmentCandidates(Number(value));
      setCandidates(response.data);
    } catch (requestError) {
      setCandidateError(
        errorMessage(requestError, "Kandidat karyawan gagal dimuat."),
      );
    } finally {
      setLoadingCandidates(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setMessage("");
    if (!projectId || !candidateId || !projectRole.trim() || !startDate) {
      setMessage("Proyek, karyawan, peran, dan tanggal mulai wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const response = await createProjectAssignment(Number(projectId), {
        user_id: Number(candidateId),
        project_role: projectRole.trim(),
        start_date: startDate,
      });
      onSuccess(response.message);
    } catch (requestError) {
      const validation = parseLaravelError(
        requestError instanceof ApiError ? requestError.data : null,
      );
      setErrors(validation.errors ?? {});
      setMessage(
        errorMessage(requestError, "Karyawan gagal ditugaskan."),
      );
    } finally {
      setSaving(false);
    }
  }

  const candidate = candidates.find((item) => item.id === Number(candidateId));

  return (
    <AdminDialog title="Tugaskan Karyawan ke Proyek" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
        <Field label="Proyek" error={firstFieldError(errors, "project_id")}>
          <select
            value={projectId}
            onChange={(event) => void selectProject(event.target.value)}
            disabled={saving}
            className="h-11 w-full rounded-xl border border-[#c8dfe8] bg-white px-3 text-sm text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20 disabled:bg-slate-50"
          >
            <option value="">Pilih proyek</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Karyawan" error={firstFieldError(errors, "user_id")}>
          <select
            value={candidateId}
            onChange={(event) => setCandidateId(event.target.value)}
            disabled={
              !projectId ||
              loadingCandidates ||
              saving ||
              candidates.length === 0
            }
            className="h-11 w-full rounded-xl border border-[#c8dfe8] bg-white px-3 text-sm text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20 disabled:bg-slate-50"
          >
            <option value="">
              {loadingCandidates ? "Memuat kandidat..." : "Pilih Karyawan"}
            </option>
            {candidates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} — {item.email} (
                {item.division?.name ?? "Tanpa divisi"})
              </option>
            ))}
          </select>
        </Field>

        {candidate && (
          <div className="rounded-xl border border-[#d0e6ed] bg-[#EAF7FB]/40 p-3 text-xs">
            <p className="font-bold text-[#030303]">{candidate.name}</p>
            <p className="mt-0.5 text-[#5a737e]">
              {candidate.email} · {candidate.division?.name ?? "Tanpa divisi"}
            </p>
          </div>
        )}

        {candidateError && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 text-xs text-red-600"
          >
            <span>{candidateError}</span>
            <button
              type="button"
              onClick={() => void selectProject(projectId)}
              className="shrink-0 font-semibold underline"
            >
              Coba lagi
            </button>
          </div>
        )}

        {!loadingCandidates &&
          projectId &&
          !candidateError &&
          candidates.length === 0 && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">
              Tidak ada karyawan aktif baru untuk proyek ini. Penugasan nonaktif
              dapat diaktifkan kembali langsung melalui tabel.
            </p>
          )}

        <Field
          label="Peran dalam Proyek"
          error={firstFieldError(errors, "project_role")}
        >
          <input
            value={projectRole}
            placeholder="Contoh: Frontend Developer, UI Designer"
            onChange={(event) => setProjectRole(event.target.value)}
            disabled={saving}
            maxLength={100}
            className="h-11 w-full rounded-xl border border-[#c8dfe8] px-3.5 text-sm text-[#030303] outline-none placeholder:text-[#8399a2] focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20 disabled:bg-slate-50"
          />
        </Field>

        <Field
          label="Tanggal Mulai"
          error={firstFieldError(errors, "start_date")}
        >
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            disabled={saving}
            className="h-11 w-full rounded-xl border border-[#c8dfe8] px-3.5 text-sm text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20 disabled:bg-slate-50"
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
            disabled={
              saving ||
              loadingCandidates ||
              !projectId ||
              !candidateId ||
              !projectRole.trim()
            }
            className="rounded-xl bg-[#016273] px-5 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#014d5a] disabled:opacity-50"
          >
            {saving ? "Menugaskan..." : "Tugaskan Karyawan"}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}

function EditAssignmentDialog({
  row,
  onClose,
  onSuccess,
}: {
  row: AssignmentRow;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [projectRole, setProjectRole] = useState(row.assignment.project_role);
  const [startDate, setStartDate] = useState(row.assignment.start_date);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<LaravelFieldErrors>({});
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setMessage("");
    if (!projectRole.trim() || !startDate) {
      setMessage("Peran dan tanggal mulai wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const response = await updateProjectAssignment(
        row.project.id,
        row.assignment.id,
        {
          project_role: projectRole.trim(),
          start_date: startDate,
        },
      );
      onSuccess(response.message);
    } catch (requestError) {
      const validation = parseLaravelError(
        requestError instanceof ApiError ? requestError.data : null,
      );
      setErrors(validation.errors ?? {});
      setMessage(
        errorMessage(requestError, "Penugasan gagal diperbarui."),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminDialog title="Ubah Penugasan Anggota" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
        <div className="rounded-xl border border-[#d0e6ed] bg-[#EAF7FB]/40 p-3 text-xs">
          <p className="font-bold text-[#030303]">
            {row.assignment.user.name}
          </p>
          <p className="mt-0.5 text-[#5a737e]">
            {row.project.name} ·{" "}
            {row.assignment.user.division?.name ?? "Tanpa divisi"}
          </p>
        </div>

        <Field
          label="Peran dalam Proyek"
          error={firstFieldError(errors, "project_role")}
        >
          <input
            value={projectRole}
            onChange={(event) => setProjectRole(event.target.value)}
            disabled={saving}
            maxLength={100}
            className="h-11 w-full rounded-xl border border-[#c8dfe8] px-3.5 text-sm text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20 disabled:bg-slate-50"
          />
        </Field>

        <Field
          label="Tanggal Mulai"
          error={firstFieldError(errors, "start_date")}
        >
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            disabled={saving}
            className="h-11 w-full rounded-xl border border-[#c8dfe8] px-3.5 text-sm text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20 disabled:bg-slate-50"
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

function ToggleAssignmentDialog({
  row,
  onClose,
  onSuccess,
}: {
  row: AssignmentRow;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const activating = row.assignment.status === "nonaktif";
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function confirm() {
    setSaving(true);
    setMessage("");
    try {
      const response = await updateProjectAssignment(
        row.project.id,
        row.assignment.id,
        { status: activating ? "aktif" : "nonaktif" },
      );
      onSuccess(response.message);
    } catch (requestError) {
      setMessage(
        errorMessage(requestError, "Status penugasan gagal diperbarui."),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminDialog
      title={
        activating
          ? "Aktifkan Kembali Penugasan"
          : "Nonaktifkan Penugasan"
      }
      onClose={onClose}
    >
      <div className="space-y-4 p-5 sm:p-6">
        <p className="text-sm font-bold text-[#030303]">
          {activating
            ? "Aktifkan kembali penugasan ini?"
            : "Nonaktifkan penugasan anggota ini?"}
        </p>
        <p className="text-xs leading-relaxed text-[#5a737e] sm:text-sm">
          {activating
            ? `${row.assignment.user.name} akan kembali dapat membuat aktivitas pada ${row.project.name}.`
            : `${row.assignment.user.name} tidak akan lagi dapat membuat aktivitas baru pada ${row.project.name}, tetapi seluruh histori aktivitas dan penugasan sebelumnya tetap tersimpan rapi.`}
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
            className="rounded-xl border border-[#d0e6ed] px-4 py-2 text-xs font-semibold text-[#5a737e] hover:bg-[#EAF7FB] disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={saving}
            className={`rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-50 ${
              activating
                ? "bg-[#016273] hover:bg-[#014d5a]"
                : "bg-rose-600 hover:bg-rose-700"
            }`}
          >
            {saving
              ? "Memproses..."
              : activating
                ? "Aktifkan Kembali"
                : "Nonaktifkan"}
          </button>
        </div>
      </div>
    </AdminDialog>
  );
}

function IconButton({
  icon,
  title,
  label,
  tone = "green",
  onClick,
}: {
  icon: "edit" | "user-minus" | "user-check";
  title: string;
  label: string;
  tone?: "green" | "red";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={label}
      onClick={onClick}
      className={`rounded-lg border p-2 transition-colors ${
        icon === "edit"
          ? "border-[#d0e6ed] text-[#5a737e] hover:bg-[#EAF7FB] hover:text-[#016273]"
          : tone === "red"
            ? "border-rose-200 text-rose-600 hover:bg-rose-50"
            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
      }`}
    >
      <AdminIcon name={icon} className="h-4 w-4" />
    </button>
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

function StatusBadge({ status }: { status: ProjectAssignment["status"] }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        status === "aktif"
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
          : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20"
      }`}
    >
      {status === "aktif" ? "Aktif" : "Nonaktif"}
    </span>
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

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "—"
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

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function errorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError))
    return "Tidak dapat terhubung ke server.";
  if (error.status === 403)
    return "Anda tidak memiliki izin untuk tindakan ini.";
  if (error.status === 404)
    return "Data penugasan tidak ditemukan.";
  if (error.status === 422) return error.message || fallback;
  if (error.status >= 500)
    return "Server sedang bermasalah. Silakan coba lagi.";
  return error.message || fallback;
}
