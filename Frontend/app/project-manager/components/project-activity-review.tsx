"use client";

import { useCallback, useEffect, useState } from "react";
import AdminDialog from "../../admin/components/admin-dialog";
import { AdminIcon } from "../../admin/components/admin-icons";
import MediaList from "../../admin/components/media-list";
import { useActivities } from "../../hooks/use-activities";
import {
  approveActivity,
  getActivities,
  rejectActivity,
  type Activity,
  type ActivityStatus,
} from "../../services/activity-service";
import { getProjects, type Project } from "../../services/project-service";
import type { PaginationMeta } from "../../services/user-service";

const statusLabels: Record<ActivityStatus, string> = {
  pending: "Pending",
  ongoing: "Berjalan",
  selesai: "Menunggu Validasi",
  approved: "Disetujui",
  rejected: "Perlu Revisi",
};

type ReviewAction = "approve" | "reject";

export default function ProjectActivityReview() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ActivityStatus | "">("selesai");
  const [projectId, setProjectId] = useState<number | undefined>();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsError, setProjectsError] = useState(false);
  const [projectRequestVersion, setProjectRequestVersion] = useState(0);
  const [review, setReview] = useState<{ activity: Activity; action: ReviewAction } | null>(null);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    let active = true;

    // Daftar proyek berasal dari endpoint yang sudah dibatasi policy PM,
    // sehingga filter tidak pernah menawarkan proyek milik PM lain.
    void getProjects()
      .then((items) => {
        if (active) setProjects(items);
      })
      .catch(() => {
        if (active) setProjectsError(true);
      });

    return () => {
      active = false;
    };
  }, [projectRequestVersion]);

  const activities = useActivities({
    search: search || undefined,
    status: status || undefined,
    projectId,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    perPage: 10,
  });
  const awaitingCount = useAwaitingValidationCount();

  function resetFilters() {
    setSearchInput("");
    setSearch("");
    setStatus("selesai");
    setProjectId(undefined);
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  function finishReview(message: string) {
    setReview(null);
    setSuccess(message);

    // List aktif dan count header memakai request terpisah. Keduanya harus
    // diambil ulang agar hasil keputusan langsung konsisten di seluruh UI.
    activities.refetch();
    awaitingCount.refetch();
  }

  const hasActiveFilters = Boolean(search || projectId || dateFrom || dateTo || status !== "selesai");

  return (
    <main className="space-y-6 p-4 sm:p-7" aria-busy={activities.isLoading}>
      <header>
        <h1 className="text-2xl font-bold text-[#172b4d]">Validasi Aktivitas</h1>
        <p className="mt-1 text-sm text-[#71829a]">
          {awaitingCount.isLoading
            ? "Memuat jumlah aktivitas..."
            : awaitingCount.error
              ? "— aktivitas menunggu validasi"
              : `${awaitingCount.total} aktivitas menunggu validasi`}
        </p>
      </header>

      {success && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess("")} aria-label="Tutup notifikasi" className="rounded p-1 hover:bg-green-100">
            <AdminIcon name="x" className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-sm" aria-label="Daftar aktivitas untuk divalidasi">
        <ActivityFilters
          searchInput={searchInput}
          status={status}
          projectId={projectId}
          projects={projects}
          projectsError={projectsError}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onSearch={setSearchInput}
          onStatus={(value) => { setStatus(value); setPage(1); }}
          onProject={(value) => { setProjectId(value); setPage(1); }}
          onDateFrom={(value) => { setDateFrom(value); setPage(1); }}
          onDateTo={(value) => { setDateTo(value); setPage(1); }}
          onReset={resetFilters}
          onRetryProjects={() => {
            setProjectsError(false);
            setProjectRequestVersion((value) => value + 1);
          }}
        />

        {activities.error ? (
          <div className="p-16 text-center" role="alert">
            <p className="text-sm font-semibold text-red-700">Aktivitas gagal dimuat.</p>
            <p className="mt-1 text-sm text-[#71829a]">Periksa koneksi atau hak akses Anda, lalu coba kembali.</p>
            <button type="button" onClick={activities.refetch} className="mt-4 rounded-xl bg-[#43a956] px-4 py-2 text-sm font-semibold text-white hover:bg-[#368f48]">
              Coba Lagi
            </button>
          </div>
        ) : (
          <ActivityCards
            data={activities.data}
            loading={activities.isLoading}
            defaultQueue={!hasActiveFilters}
            onReview={(activity, action) => setReview({ activity, action })}
          />
        )}

        <Pagination meta={activities.meta} loading={activities.isLoading} onPage={setPage} />
      </section>

      {review && (
        <ReviewDialog
          activity={review.activity}
          action={review.action}
          onClose={() => setReview(null)}
          onSuccess={finishReview}
        />
      )}
    </main>
  );
}

function ActivityFilters({
  searchInput,
  status,
  projectId,
  projects,
  projectsError,
  dateFrom,
  dateTo,
  onSearch,
  onStatus,
  onProject,
  onDateFrom,
  onDateTo,
  onReset,
  onRetryProjects,
}: {
  searchInput: string;
  status: ActivityStatus | "";
  projectId?: number;
  projects: Project[];
  projectsError: boolean;
  dateFrom: string;
  dateTo: string;
  onSearch: (value: string) => void;
  onStatus: (value: ActivityStatus | "") => void;
  onProject: (value?: number) => void;
  onDateFrom: (value: string) => void;
  onDateTo: (value: string) => void;
  onReset: () => void;
  onRetryProjects: () => void;
}) {
  return (
    <div className="border-b border-[#e1e7ee] p-4 sm:p-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(260px,1.4fr)_minmax(180px,.8fr)_minmax(180px,.8fr)_170px_170px_auto]">
        <label className="relative md:col-span-2 xl:col-span-1">
          <span className="sr-only">Cari aktivitas atau karyawan</span>
          <AdminIcon name="search" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#91a0b3]" />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Cari aktivitas atau karyawan..."
            className="h-11 w-full rounded-xl border border-[#dce4ec] pl-11 pr-3 text-sm outline-none focus:border-[#43a956] focus:ring-2 focus:ring-[#43a956]/15"
          />
        </label>

        <label>
          <span className="sr-only">Filter proyek</span>
          <select
            value={projectId ?? ""}
            disabled={projectsError}
            onChange={(event) => onProject(event.target.value ? Number(event.target.value) : undefined)}
            className="h-11 w-full rounded-xl border border-[#dce4ec] bg-white px-3 text-sm disabled:bg-slate-100 disabled:text-[#91a0b3]"
          >
            <option value="">Semua Proyek</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </label>

        <label>
          <span className="sr-only">Filter status</span>
          <select
            value={status}
            onChange={(event) => onStatus(event.target.value as ActivityStatus | "")}
            className="h-11 w-full rounded-xl border border-[#dce4ec] bg-white px-3 text-sm"
          >
            <option value="selesai">Menunggu Validasi</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Perlu Revisi</option>
            <option value="">Semua Status</option>
          </select>
        </label>

        <label>
          <span className="sr-only">Tanggal mulai</span>
          <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => onDateFrom(event.target.value)} className="h-11 w-full rounded-xl border border-[#dce4ec] bg-white px-3 text-sm" />
        </label>
        <label>
          <span className="sr-only">Tanggal akhir</span>
          <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => onDateTo(event.target.value)} className="h-11 w-full rounded-xl border border-[#dce4ec] bg-white px-3 text-sm" />
        </label>
        <button type="button" onClick={onReset} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#dce4ec] px-4 text-sm font-semibold text-[#60738f] hover:bg-slate-50">
          <AdminIcon name="filter" className="h-4 w-4" />Reset
        </button>
      </div>

      {projectsError && (
        <p className="mt-3 text-sm text-amber-700" role="alert">
          Filter proyek tidak tersedia. <button type="button" onClick={onRetryProjects} className="font-semibold underline">Coba lagi</button>
        </p>
      )}
    </div>
  );
}

function ActivityCards({
  data,
  loading,
  defaultQueue,
  onReview,
}: {
  data: Activity[];
  loading: boolean;
  defaultQueue: boolean;
  onReview: (activity: Activity, action: ReviewAction) => void;
}) {
  if (loading) return <PanelMessage text="Memuat aktivitas..." />;
  if (data.length === 0) return <PanelMessage text={defaultQueue ? "Tidak ada aktivitas yang menunggu validasi." : "Tidak ada aktivitas yang cocok."} />;

  return (
    <div className="space-y-4 bg-[#f7f9fb] p-4 sm:p-6">
      {data.map((activity) => {
        const canApprove = activity.status === "selesai" || activity.status === "rejected";
        const canRequestRevision = activity.status === "selesai" || activity.status === "approved";

        return (
          <article key={activity.id} className="rounded-2xl border border-[#dce4ec] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#43a956] text-sm font-bold text-white" aria-hidden="true">{initials(activity.user.name)}</span>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold text-[#172b4d]">{activity.user.name}</h2>
                  <p className="mt-1 text-sm text-[#60738f]">{activity.project?.name ?? "Tanpa proyek"}<span aria-hidden="true"> · </span>{activity.user.division?.name ?? "Divisi —"}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                <time dateTime={activity.created_at} className="text-sm text-[#71829a]">{formatDateTime(activity.created_at)}</time>
                <StatusBadge status={activity.status} />
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-[#f7f9fb] p-4">
              {activity.task && <p className="mb-2 text-xs font-semibold text-[#43a956]">Tugas: {activity.task.title}</p>}
              <h3 className="font-semibold text-[#172b4d]">{activity.title}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#60738f]">{activity.description || "Tanpa deskripsi"}</p>
              <p className="mt-3 text-xs text-[#71829a]">Tanggal aktivitas: {formatDate(activity.activity_date)}</p>
              <MediaList items={activity.media} />
            </div>

            <ReviewHistory activity={activity} />

            {(canApprove || canRequestRevision) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {canApprove && <button type="button" onClick={() => onReview(activity, "approve")} aria-label={`Setujui aktivitas ${activity.title}`} className="rounded-xl bg-[#43a956] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#368f48]">Setujui</button>}
                {canRequestRevision && <button type="button" onClick={() => onReview(activity, "reject")} aria-label={`Minta revisi aktivitas ${activity.title}`} className="rounded-xl border border-[#d8e0e9] bg-white px-4 py-2.5 text-sm font-semibold text-[#60738f] hover:bg-slate-50">Minta Revisi</button>}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function ReviewHistory({ activity }: { activity: Activity }) {
  if (activity.status === "approved") {
    return <p className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">Disetujui oleh <strong>{activity.approved_by?.name ?? "—"}</strong> pada {formatDateTime(activity.approved_at)}.</p>;
  }

  if (activity.status === "rejected") {
    return <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><p>Diminta revisi oleh <strong>{activity.rejected_by?.name ?? "—"}</strong> pada {formatDateTime(activity.rejected_at)}.</p><p className="mt-2"><strong>Alasan revisi:</strong> {activity.rejection_reason || "—"}</p></div>;
  }

  return null;
}

function ReviewDialog({ activity, action, onClose, onSuccess }: { activity: Activity; action: ReviewAction; onClose: () => void; onSuccess: (message: string) => void }) {
  const revising = action === "reject";
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [requestError, setRequestError] = useState("");
  const reasonErrorId = `activity-${activity.id}-revision-error`;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedReason = reason.trim();
    if (revising && !normalizedReason) {
      setValidationError("Alasan revisi wajib diisi.");
      return;
    }

    setSaving(true);
    setValidationError("");
    setRequestError("");

    try {
      // "Minta Revisi" memakai endpoint reject existing agar alasan,
      // reviewer, policy, dan transition guard tetap diputuskan backend.
      const response = revising ? await rejectActivity(activity.id, normalizedReason) : await approveActivity(activity.id);
      onSuccess(response.message);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Keputusan gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminDialog title={revising ? "Minta Revisi" : "Setujui Aktivitas"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
        {revising ? (
          <p className="text-sm leading-6 text-[#60738f]">Minta revisi untuk <strong className="text-[#172b4d]">{activity.title}</strong> milik {activity.user.name}?</p>
        ) : (
          <div className="space-y-1 text-sm leading-6 text-[#60738f]">
            <p className="font-semibold text-[#172b4d]">Setujui aktivitas ini?</p>
            <p>Setelah disetujui, aktivitas akan berstatus Disetujui.</p>
          </div>
        )}
        {revising && (
          <label className="block text-sm font-semibold text-[#172b4d]">
            Alasan Revisi
            <textarea
              required
              maxLength={1000}
              rows={4}
              value={reason}
              placeholder="Jelaskan bagian yang perlu diperbaiki..."
              aria-invalid={Boolean(validationError)}
              aria-describedby={validationError ? reasonErrorId : undefined}
              onChange={(event) => { setReason(event.target.value); if (validationError) setValidationError(""); }}
              className="mt-2 w-full rounded-xl border border-[#dce4ec] p-3 font-normal outline-none focus:border-[#43a956] focus:ring-2 focus:ring-[#43a956]/15"
            />
          </label>
        )}
        {validationError && <p id={reasonErrorId} role="alert" className="text-sm text-red-600">{validationError}</p>}
        {requestError && <p role="alert" className="text-sm text-red-600">{requestError}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-60">Batal</button>
          <button type="submit" disabled={saving} className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${revising ? "bg-amber-600" : "bg-[#43a956]"}`}>{saving ? "Memproses..." : revising ? "Kirim Permintaan Revisi" : "Setujui"}</button>
        </div>
      </form>
    </AdminDialog>
  );
}

function Pagination({ meta, loading, onPage }: { meta: PaginationMeta | null; loading: boolean; onPage: (page: number) => void }) {
  if (!meta) return null;
  return <footer className="flex flex-col gap-3 border-t border-[#e1e7ee] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-[#71829a]">Menampilkan {meta.from ?? 0}–{meta.to ?? 0} dari {meta.total}</p><div className="flex items-center gap-2"><button type="button" disabled={loading || meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Sebelumnya</button><span className="rounded-lg bg-[#43a956] px-3 py-2 text-sm font-semibold text-white" aria-label={`Halaman ${meta.current_page} dari ${meta.last_page}`}>{meta.current_page} / {meta.last_page}</span><button type="button" disabled={loading || meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Berikutnya</button></div></footer>;
}

function useAwaitingValidationCount() {
  const [total, setTotal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [requestVersion, setRequestVersion] = useState(0);
  const refetch = useCallback(() => {
    setIsLoading(true);
    setError(false);
    setRequestVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    let active = true;

    // Count memakai request sendiri agar header selalu mewakili seluruh
    // antrean PM, bukan total dari hasil search/filter halaman saat ini.
    void getActivities({ status: "selesai", page: 1, perPage: 1 })
      .then((response) => { if (active) setTotal(response.meta.total); })
      .catch(() => { if (active) { setTotal(null); setError(true); } })
      .finally(() => { if (active) setIsLoading(false); });

    return () => { active = false; };
  }, [requestVersion]);

  return { total, isLoading, error, refetch };
}

function StatusBadge({ status }: { status: ActivityStatus }) {
  const tone = status === "approved" ? "bg-green-100 text-green-700" : status === "rejected" ? "bg-red-100 text-red-700" : status === "selesai" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{statusLabels[status]}</span>;
}

function PanelMessage({ text }: { text: string }) {
  return <p className="flex min-h-56 items-center justify-center bg-[#f7f9fb] px-6 text-center text-sm text-[#71829a]">{text}</p>;
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "—";
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(year, month - 1, day));
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
