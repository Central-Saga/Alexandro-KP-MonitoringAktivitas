"use client";

import { useEffect, useMemo, useState } from "react";
import AdminDialog from "../../admin/components/admin-dialog";
import { AdminIcon } from "../../admin/components/admin-icons";
import { useProjects } from "../../hooks/use-projects";
import { ApiError } from "../../lib/api-client";
import {
  firstFieldError,
  parseLaravelError,
  type LaravelFieldErrors,
} from "../../lib/validation";
import {
  getProject,
  updateProject,
  type Project,
  type ProjectAssignment,
} from "../../services/project-service";

type DialogState = { type: "view" | "edit"; project: Project } | null;

export default function ManagedProjects() {
  const projects = useProjects();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [success, setSuccess] = useState("");

  const statuses = useMemo(
    () =>
      [
        ...new Set(
          projects.data.map((project) => project.status).filter(Boolean),
        ),
      ].sort(),
    [projects.data],
  );

  const visibleProjects = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("id-ID");
    return projects.data.filter((project) => {
      const matchesSearch =
        !term ||
        [project.name, project.client_name].some((value) =>
          value?.toLocaleLowerCase("id-ID").includes(term),
        );
      return matchesSearch && (!status || project.status === status);
    });
  }, [projects.data, search, status]);

  function editSucceeded(message: string) {
    setDialog(null);
    setSuccess(message);
    projects.refetch();
  }

  return (
    <main className="space-y-6 p-4 sm:p-7">
      <header>
        <h1 className="text-2xl font-bold text-[#030303]">Data Proyek</h1>
        <p className="mt-1 text-sm text-[#5a737e]">
          Kelola proyek yang berada dalam tanggung jawab Anda.
        </p>
      </header>

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
        <div className="grid gap-3 border-b border-[#d0e6ed] p-4 sm:grid-cols-[minmax(0,1fr)_220px] sm:p-6">
          <label className="relative block">
            <span className="sr-only">Cari nama proyek atau klien</span>
            <AdminIcon
              name="search"
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8399a2]"
            />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama proyek atau klien..."
              className="h-11 w-full rounded-xl border border-[#c8dfe8] bg-white pl-12 pr-4 text-sm text-[#030303] outline-none placeholder:text-[#8399a2] focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
            />
          </label>
          <label className="block">
            <span className="sr-only">Filter status proyek</span>
            <select
              value={status}
              disabled={statuses.length === 0}
              onChange={(event) => setStatus(event.target.value)}
              className="h-11 w-full rounded-xl border border-[#c8dfe8] bg-white px-3 text-sm text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              <option value="">Semua Status</option>
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {formatStatus(value)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {projects.error ? (
          <ErrorState onRetry={projects.refetch} />
        ) : (
          <ProjectTable
            projects={visibleProjects}
            loading={projects.isLoading}
            hasFilters={Boolean(search.trim() || status)}
            onView={(project) => setDialog({ type: "view", project })}
            onEdit={(project) => setDialog({ type: "edit", project })}
          />
        )}
      </section>

      {dialog?.type === "view" && (
        <ProjectDetailDialog
          project={dialog.project}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog?.type === "edit" && (
        <ProjectEditDialog
          project={dialog.project}
          onClose={() => setDialog(null)}
          onSuccess={editSucceeded}
        />
      )}
    </main>
  );
}

function ProjectTable({
  projects,
  loading,
  hasFilters,
  onView,
  onEdit,
}: {
  projects: Project[];
  loading: boolean;
  hasFilters: boolean;
  onView: (project: Project) => void;
  onEdit: (project: Project) => void;
}) {
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-[850px] border-collapse text-left text-sm">
        <thead className="border-b border-[#d0e6ed] bg-[#EAF7FB] text-xs font-semibold uppercase tracking-wider text-[#030303]">
          <tr>
            <th className="px-5 py-3.5">Nama Proyek</th>
            <th className="px-4 py-3.5">Klien</th>
            <th className="px-4 py-3.5">Tgl Mulai</th>
            <th className="px-4 py-3.5">Tgl Selesai</th>
            <th className="px-4 py-3.5">Anggota</th>
            <th className="px-4 py-3.5">Status</th>
            <th className="px-5 py-3.5 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#d0e6ed]">
          {loading ? (
            <TableMessage text="Memuat data proyek..." />
          ) : projects.length === 0 ? (
            <TableMessage
              text={
                hasFilters
                  ? "Tidak ada proyek yang cocok dengan pencarian atau filter."
                  : "Belum ada proyek yang ditugaskan kepada Anda."
              }
            />
          ) : (
            projects.map((project) => (
              <tr
                key={project.id}
                className="transition-colors hover:bg-[#EAF7FB]/40"
              >
                <td className="px-5 py-4 font-semibold text-[#030303]">
                  {project.name || "—"}
                </td>
                <td className="px-4 py-4 text-xs text-[#5a737e]">
                  {project.client_name || "—"}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-xs text-[#5a737e]">
                  {formatDate(project.start_date)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-xs text-[#5a737e]">
                  {formatDate(project.end_date)}
                </td>
                <td className="px-4 py-4 text-xs font-semibold text-[#016273]">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#EAF7FB] px-2.5 py-1 text-[#016273]">
                    <AdminIcon name="users" className="h-3.5 w-3.5" />
                    {project.active_assignments_count}
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <StatusBadge status={project.status} />
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <ActionButton
                      label={`Lihat proyek ${project.name}`}
                      title="Lihat detail"
                      icon="eye"
                      onClick={() => onView(project)}
                    />
                    <ActionButton
                      label={`Edit proyek ${project.name}`}
                      title="Edit proyek"
                      icon="edit"
                      onClick={() => onEdit(project)}
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

function ProjectDetailDialog({
  project,
  onClose,
}: {
  project: Project;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<Project | null>(null);
  const [error, setError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    let active = true;
    void getProject(project.id)
      .then((response) => {
        if (active) setDetail(response.data);
      })
      .catch((requestError) => {
        if (active)
          setError(
            errorMessage(requestError, "Detail proyek gagal dimuat."),
          );
      });
    return () => {
      active = false;
    };
  }, [project.id, requestVersion]);

  const assignments = detail?.assignments ?? [];
  const activeCount = assignments.filter(
    (assignment) => assignment.status === "aktif",
  ).length;
  const inactiveCount = assignments.filter(
    (assignment) => assignment.status === "nonaktif",
  ).length;

  return (
    <AdminDialog title="Detail Proyek" onClose={onClose}>
      <div className="space-y-6 p-5 sm:p-6">
        {error ? (
          <div className="py-8 text-center">
            <p role="alert" className="text-xs text-red-600">
              {error}
            </p>
            <button
              type="button"
              onClick={() => {
                setDetail(null);
                setError("");
                setRequestVersion((value) => value + 1);
              }}
              className="mt-4 rounded-xl bg-[#18a84f] px-4 py-2 text-xs font-semibold text-white"
            >
              Coba Lagi
            </button>
          </div>
        ) : !detail ? (
          <p className="py-10 text-center text-xs text-[#71829a]">
            Memuat detail proyek...
          </p>
        ) : (
          <>
            <dl className="grid gap-4 text-xs sm:grid-cols-2">
              <Detail label="Nama Proyek" value={detail.name || "—"} />
              <Detail label="Nama Klien" value={detail.client_name || "—"} />
              <Detail
                label="Tanggal Mulai"
                value={formatDate(detail.start_date)}
              />
              <Detail
                label="Tanggal Selesai"
                value={formatDate(detail.end_date)}
              />
              <div>
                <dt className="text-xs font-semibold text-[#71829a]">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={detail.status} />
                </dd>
              </div>
              <Detail
                label="Anggota Aktif"
                value={`${detail.active_assignments_count} orang`}
              />
            </dl>

            <section className="border-t border-[#d0e6ed] pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#030303]">
                  Daftar Anggota Tim
                </h3>
                <p className="text-xs font-medium text-[#5a737e]">
                  {activeCount} aktif · {inactiveCount} nonaktif
                </p>
              </div>
              {assignments.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#5a737e]">
                  Belum ada penugasan anggota pada proyek ini.
                </p>
              ) : (
                <div className="mt-3 divide-y divide-[#d0e6ed] rounded-xl border border-[#d0e6ed] bg-[#fcfdfe]">
                  {assignments.map((assignment) => (
                    <AssignmentRow
                      key={assignment.id}
                      assignment={assignment}
                    />
                  ))}
                </div>
              )}
              <p className="mt-3 text-[11px] leading-relaxed text-[#5a737e]">
                Pengelolaan alokasi anggota dilakukan melalui menu{" "}
                <strong className="text-[#030303]">Penugasan Proyek</strong>.
              </p>
            </section>
          </>
        )}
      </div>
    </AdminDialog>
  );
}

function ProjectEditDialog({
  project,
  onClose,
  onSuccess,
}: {
  project: Project;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [form, setForm] = useState({
    name: project.name,
    client_name: project.client_name,
    start_date: project.start_date,
    end_date: project.end_date ?? "",
    status: project.status,
  });
  const [errors, setErrors] = useState<LaravelFieldErrors>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const change = (field: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setMessage("");
    const clientErrors = validateProject(form);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      return;
    }
    setSaving(true);
    try {
      const response = await updateProject(project.id, {
        name: form.name.trim(),
        client_name: form.client_name.trim(),
        start_date: form.start_date,
        end_date: form.end_date || null,
        status: form.status.trim(),
      });
      onSuccess(response.message);
    } catch (requestError) {
      const validation = parseLaravelError(
        requestError instanceof ApiError ? requestError.data : null,
      );
      setErrors(validation.errors ?? {});
      setMessage(
        errorMessage(requestError, "Proyek gagal diperbarui."),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminDialog title="Ubah Data Proyek" onClose={onClose}>
      <form onSubmit={submit} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <Field
          id="pm-project-name"
          label="Nama Proyek"
          value={form.name}
          error={firstFieldError(errors, "name")}
          onChange={(value) => change("name", value)}
        />
        <Field
          id="pm-project-client"
          label="Nama Klien"
          value={form.client_name}
          error={firstFieldError(errors, "client_name")}
          onChange={(value) => change("client_name", value)}
        />
        <Field
          id="pm-project-start"
          label="Tanggal Mulai"
          type="date"
          value={form.start_date}
          error={firstFieldError(errors, "start_date")}
          onChange={(value) => change("start_date", value)}
        />
        <Field
          id="pm-project-end"
          label="Tanggal Selesai (Opsional)"
          type="date"
          required={false}
          value={form.end_date}
          error={firstFieldError(errors, "end_date")}
          onChange={(value) => change("end_date", value)}
        />
        <div className="sm:col-span-2">
          <Field
            id="pm-project-status"
            label="Status Proyek"
            value={form.status}
            error={firstFieldError(errors, "status")}
            onChange={(value) => change("status", value)}
          />
        </div>

        {message && (
          <p role="alert" className="text-xs text-red-600 sm:col-span-2">
            {message}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-[#d0e6ed] pt-4 sm:col-span-2">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
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

function AssignmentRow({ assignment }: { assignment: ProjectAssignment }) {
  return (
    <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-[#030303]">
          {assignment.user.name}
        </p>
        <p className="mt-0.5 text-xs text-[#5a737e]">
          {assignment.user.division?.name ?? "Tanpa divisi"} ·{" "}
          {assignment.project_role} · mulai {formatDate(assignment.start_date)}
        </p>
      </div>
      <span
        className={`self-start rounded-full px-2.5 py-0.5 text-xs font-semibold sm:self-auto ${
          assignment.status === "aktif"
            ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
            : "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20"
        }`}
      >
        {assignment.status === "aktif" ? "Aktif" : "Nonaktif"}
      </span>
    </div>
  );
}

function ActionButton({
  label,
  title,
  icon,
  onClick,
}: {
  label: string;
  title: string;
  icon: "eye" | "edit";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
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
  const tone = tones[status.toLowerCase()] || "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-500/20";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>
      {formatStatus(status)}
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-[#5a737e]">{label}</dt>
      <dd className="mt-0.5 font-medium text-[#030303]">{value}</dd>
    </div>
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
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={id} className="block text-xs font-semibold text-[#030303]">
      {label}
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className="mt-1.5 h-11 w-full rounded-xl border border-[#c8dfe8] px-3.5 font-normal text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
      />
      {error && (
        <span className="mt-1 block text-xs font-normal text-red-600">
          {error}
        </span>
      )}
    </label>
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

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="px-6 py-16 text-center">
      <p role="alert" className="font-semibold text-red-700">
        Data proyek gagal dimuat.
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

function validateProject(form: {
  name: string;
  client_name: string;
  start_date: string;
  end_date: string;
  status: string;
}): LaravelFieldErrors {
  const errors: LaravelFieldErrors = {};
  if (!form.name.trim()) errors.name = ["Nama proyek wajib diisi."];
  if (!form.client_name.trim()) errors.client_name = ["Nama klien wajib diisi."];
  if (!form.start_date) errors.start_date = ["Tanggal mulai wajib diisi."];
  if (form.end_date && form.start_date && form.end_date < form.start_date)
    errors.end_date = ["Tanggal selesai tidak boleh sebelum tanggal mulai."];
  if (!form.status.trim()) errors.status = ["Status wajib diisi."];
  return errors;
}

function formatStatus(value: string) {
  return value
    ? value
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "—";
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

function errorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError))
    return "Tidak dapat terhubung ke server.";
  if (error.status === 403)
    return "Anda tidak memiliki izin untuk tindakan ini.";
  if (error.status === 404) return "Proyek tidak ditemukan.";
  if (error.status >= 500)
    return "Server sedang bermasalah. Silakan coba lagi.";
  return error.message || fallback;
}
