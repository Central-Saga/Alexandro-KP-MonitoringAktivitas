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
import { FormattedActivityDescription } from "../../components/structured-activity-editor";

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
  const [review, setReview] = useState<{
    activity: Activity;
    action: ReviewAction;
  } | null>(null);
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

    // Daftar proyek dibatasi policy backend untuk Project Manager login
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
    activities.refetch();
    awaitingCount.refetch();
  }

  const hasActiveFilters = Boolean(
    search || projectId || dateFrom || dateTo || status !== "selesai",
  );

  return (
    <main className="space-y-6 p-4 sm:p-7" aria-busy={activities.isLoading}>
      <header>
        <h1 className="text-2xl font-bold text-[#030303]">
          Validasi Aktivitas
        </h1>
        <p className="mt-1 text-sm text-[#5a737e]">
          {awaitingCount.isLoading
            ? "Memuat antrian validasi..."
            : awaitingCount.error
              ? "Tinjau aktivitas karyawan pada proyek yang Anda kelola."
              : `${awaitingCount.total} aktivitas menunggu validasi`}
        </p>
      </header>

      {success && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          <span>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Tutup notifikasi"
            className="rounded p-1 text-emerald-700 hover:bg-emerald-100"
          >
            <AdminIcon name="x" className="h-4 w-4" />
          </button>
        </div>
      )}

      <section
        className="overflow-hidden rounded-2xl border border-[#d0e6ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
        aria-label="Daftar aktivitas untuk divalidasi"
      >
        <ActivityFilters
          searchInput={searchInput}
          status={status}
          projectId={projectId}
          projects={projects}
          projectsError={projectsError}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onSearch={setSearchInput}
          onStatus={(value) => {
            setStatus(value);
            setPage(1);
          }}
          onProject={(value) => {
            setProjectId(value);
            setPage(1);
          }}
          onDateFrom={(value) => {
            setDateFrom(value);
            setPage(1);
          }}
          onDateTo={(value) => {
            setDateTo(value);
            setPage(1);
          }}
          onReset={resetFilters}
          onRetryProjects={() => {
            setProjectsError(false);
            setProjectRequestVersion((value) => value + 1);
          }}
        />

        {activities.error ? (
          <div className="p-16 text-center" role="alert">
            <p className="text-sm font-semibold text-red-700">
              Aktivitas gagal dimuat.
            </p>
            <p className="mt-1 text-xs text-[#5a737e]">
              Periksa koneksi jaringan Anda, lalu coba kembali.
            </p>
            <button
              type="button"
              onClick={activities.refetch}
              className="mt-4 rounded-xl bg-[#016273] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#014d5a]"
            >
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

        <Pagination
          meta={activities.meta}
          loading={activities.isLoading}
          onPage={setPage}
        />
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
    <div className="border-b border-[#d0e6ed] p-4 sm:p-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1.4fr)_minmax(170px,.8fr)_minmax(170px,.8fr)_160px_160px_auto]">
        <label className="relative md:col-span-2 xl:col-span-1">
          <span className="sr-only">Cari aktivitas atau karyawan</span>
          <AdminIcon
            name="search"
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8399a2]"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Cari aktivitas atau karyawan..."
            className="h-11 w-full rounded-xl border border-[#c8dfe8] pl-11 pr-3 text-sm text-[#030303] outline-none placeholder:text-[#8399a2] focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
          />
        </label>

        <label>
          <span className="sr-only">Filter proyek</span>
          <select
            value={projectId ?? ""}
            disabled={projectsError}
            onChange={(event) =>
              onProject(
                event.target.value ? Number(event.target.value) : undefined,
              )
            }
            className="h-11 w-full rounded-xl border border-[#c8dfe8] bg-white px-3 text-sm text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20 disabled:bg-slate-50 disabled:text-[#8399a2]"
          >
            <option value="">Semua Proyek</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Filter status</span>
          <select
            value={status}
            onChange={(event) =>
              onStatus(event.target.value as ActivityStatus | "")
            }
            className="h-11 w-full rounded-xl border border-[#c8dfe8] bg-white px-3 text-sm text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
          >
            <option value="selesai">Menunggu Validasi</option>
            <option value="approved">Disetujui</option>
            <option value="rejected">Perlu Revisi</option>
            <option value="">Semua Status</option>
          </select>
        </label>

        <label>
          <span className="sr-only">Tanggal mulai</span>
          <input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(event) => onDateFrom(event.target.value)}
            className="h-11 w-full rounded-xl border border-[#c8dfe8] bg-white px-3 text-xs text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
          />
        </label>
        <label>
          <span className="sr-only">Tanggal akhir</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) => onDateTo(event.target.value)}
            className="h-11 w-full rounded-xl border border-[#c8dfe8] bg-white px-3 text-xs text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
          />
        </label>
        <button
          type="button"
          onClick={onReset}
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#d0e6ed] px-4 text-xs font-semibold text-[#5a737e] transition-colors hover:bg-[#EAF7FB]"
        >
          <AdminIcon name="filter" className="h-4 w-4" />
          Reset
        </button>
      </div>

      {projectsError && (
        <p className="mt-3 text-xs text-amber-700" role="alert">
          Filter proyek tidak dapat dimuat.{" "}
          <button
            type="button"
            onClick={onRetryProjects}
            className="font-semibold underline"
          >
            Coba lagi
          </button>
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
  if (loading) return <PanelMessage text="Memuat daftar aktivitas..." />;
  if (data.length === 0)
    return (
      <PanelMessage
        text={
          defaultQueue
            ? "Tidak ada aktivitas yang menunggu validasi."
            : "Tidak ada aktivitas yang cocok dengan filter."
        }
      />
    );

  return (
    <div className="space-y-4 bg-[#EAF7FB]/30 p-4 sm:p-6">
      {data.map((activity) => {
        // Review actions HANYA diizinkan saat status 'selesai' (Menunggu Validasi)
        const isAwaitingReview = activity.status === "selesai";

        return (
          <article
            key={activity.id}
            className="rounded-2xl border border-[#d0e6ed] bg-white p-5 shadow-xs transition-shadow hover:shadow-sm sm:p-6"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3.5">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#016273] text-sm font-bold text-white shadow-xs"
                  aria-hidden="true"
                >
                  {initials(activity.user.name)}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-bold text-[#030303]">
                    {activity.user.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-[#5a737e]">
                    {activity.project?.name ?? "Tanpa proyek"}
                    <span aria-hidden="true"> · </span>
                    {activity.user.division?.name ?? "Tanpa divisi"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 sm:justify-end">
                <time
                  dateTime={activity.created_at}
                  className="text-xs text-[#5a737e]"
                >
                  {formatDateTime(activity.created_at)}
                </time>
                <StatusBadge status={activity.status} />
                {activity.status === "selesai" && activity.revision_count > 0 && (
                  <span className="text-[10px] font-medium text-amber-700">Pernah direvisi {activity.revision_count}x</span>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-[#d0e6ed] bg-[#fcfdfe] p-4">
              {activity.task && (
                <p className="mb-1.5 text-xs font-bold text-[#016273]">
                  Tugas: {activity.task.title}
                </p>
              )}
              <h3 className="text-sm font-bold text-[#030303]">
                {activity.title}
              </h3>
              <div className="mt-2.5">
                <FormattedActivityDescription description={activity.description} />
              </div>
              <p className="mt-3 text-[11px] font-medium text-[#5a737e]">
                Tanggal aktivitas: {formatDate(activity.activity_date)}
              </p>
              {activity.media.length > 0 && (
                <div className="mt-3">
                  <MediaList items={activity.media} />
                </div>
              )}
            </div>

            <ReviewHistory activity={activity} />

            {/* Aksi Setujui dan Minta Revisi hanya ditampilkan saat status menunggu validasi */}
            {isAwaitingReview && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-[#d0e6ed] pt-3.5">
                <button
                  type="button"
                  onClick={() => onReview(activity, "approve")}
                  aria-label={`Setujui aktivitas ${activity.title}`}
                  className="rounded-xl bg-[#016273] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#014d5a]"
                >
                  Setujui
                </button>
                <button
                  type="button"
                  onClick={() => onReview(activity, "reject")}
                  aria-label={`Minta revisi aktivitas ${activity.title}`}
                  className="rounded-xl border border-[#d0e6ed] bg-white px-4 py-2 text-xs font-semibold text-[#5a737e] transition-colors hover:bg-[#EAF7FB] hover:text-[#016273]"
                >
                  Minta Revisi
                </button>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function ReviewHistory({ activity }: { activity: Activity }) {
  if (activity.review_history.length === 0) return null;

  return (
    <section className="mt-4 rounded-xl border border-[#d0e6ed] bg-[#fcfdfe] px-4 py-3">
      <h3 className="text-xs font-bold text-[#030303]">Riwayat Review</h3>
      <div className="mt-2 divide-y divide-[#e5eef2]">
        {activity.review_history.map((item, index) => (
          <div key={`${item.created_at}-${index}`} className="flex gap-3 py-2.5 text-xs">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.action === "approved" ? "bg-emerald-500" : item.action === "revision_requested" ? "bg-amber-500" : "bg-[#016273]"}`} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[#030303]">{reviewActionLabel(item.action)}</p>
              {item.note && <p className="mt-1 whitespace-pre-wrap text-[#5a737e]">“{item.note}”</p>}
              <p className="mt-1 text-[10.5px] text-[#8399a2]">{item.actor?.name ?? "Akun tidak tersedia"} • {formatDateTime(item.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReviewDialog({
  activity,
  action,
  onClose,
  onSuccess,
}: {
  activity: Activity;
  action: ReviewAction;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
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
      setValidationError("Catatan revisi wajib diisi.");
      return;
    }

    setSaving(true);
    setValidationError("");
    setRequestError("");

    try {
      const response = revising
        ? await rejectActivity(activity.id, normalizedReason)
        : await approveActivity(activity.id);
      onSuccess(response.message);
    } catch (error) {
      setRequestError(
        error instanceof Error ? error.message : "Keputusan gagal disimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminDialog
      title={revising ? "Minta Revisi Aktivitas" : "Setujui Aktivitas"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
        {revising ? (
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-[#5a737e]">Berikan catatan yang jelas agar karyawan mengetahui bagian yang perlu diperbaiki.</p>
            <dl className="grid gap-2 rounded-xl border border-[#d0e6ed] bg-[#EAF7FB]/35 p-3 text-xs sm:grid-cols-2">
              <DetailItem label="Karyawan" value={activity.user.name} />
              <DetailItem label="Nama aktivitas" value={activity.title} />
              <DetailItem label="Proyek" value={activity.project?.name ?? "—"} />
              <DetailItem label="Task" value={activity.task?.title ?? "—"} />
              <DetailItem label="Tanggal aktivitas" value={formatDate(activity.activity_date)} />
            </dl>
          </div>
        ) : (
          <div className="space-y-1 text-xs text-[#5a737e] sm:text-sm">
            <p className="font-semibold text-[#030303]">
              Setujui aktivitas ini?
            </p>
            <p>
              Aktivitas akan disetujui dan ditandai sebagai terverifikasi.
            </p>
          </div>
        )}

        {revising && (
          <label className="block text-xs font-semibold text-[#030303]">
            CATATAN REVISI <span className="text-amber-700">*</span>
            <textarea
              required
              maxLength={1000}
              rows={4}
              value={reason}
              placeholder="Contoh: Tambahkan hasil testing fitur login dan lampirkan bukti screenshot."
              aria-invalid={Boolean(validationError)}
              aria-describedby={validationError ? reasonErrorId : undefined}
              onChange={(event) => {
                setReason(event.target.value);
                if (validationError) setValidationError("");
              }}
              className="mt-1.5 w-full rounded-xl border border-[#c8dfe8] p-3 text-xs font-normal text-[#030303] outline-none placeholder:text-[#8399a2] focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
            />
            <span className="mt-1 block text-[11px] font-normal text-[#8399a2]">Catatan ini akan ditampilkan kepada karyawan.</span>
          </label>
        )}

        {validationError && (
          <p id={reasonErrorId} role="alert" className="text-xs text-red-600">
            {validationError}
          </p>
        )}
        {requestError && (
          <p role="alert" className="text-xs text-red-600">
            {requestError}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-[#d0e6ed] pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-[#d0e6ed] px-4 py-2 text-xs font-semibold text-[#5a737e] hover:bg-[#EAF7FB] disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`rounded-xl px-5 py-2 text-xs font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              revising
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-[#016273] hover:bg-[#014d5a]"
            }`}
          >
            {saving
              ? revising ? "Mengirim..." : "Memproses..."
              : revising
                ? "Kirim Permintaan Revisi"
                : "Setujui Aktivitas"}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[10px] font-medium uppercase tracking-wide text-[#8399a2]">{label}</dt><dd className="mt-0.5 line-clamp-2 font-semibold text-[#030303]">{value}</dd></div>;
}

function reviewActionLabel(action: Activity["review_history"][number]["action"]) {
  return action === "submitted" ? "Mengirim aktivitas untuk validasi" : action === "revision_requested" ? "Meminta revisi" : action === "resubmitted" ? "Mengirim ulang aktivitas" : "Aktivitas disetujui";
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
        Menampilkan {meta.from ?? 0}–{meta.to ?? 0} dari {meta.total} aktivitas
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
    void getActivities({ status: "selesai", page: 1, perPage: 1 })
      .then((response) => {
        if (active) setTotal(response.meta.total);
      })
      .catch(() => {
        if (active) {
          setTotal(null);
          setError(true);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [requestVersion]);

  return { total, isLoading, error, refetch };
}

function StatusBadge({ status }: { status: ActivityStatus }) {
  const tone =
    status === "approved"
      ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
      : status === "rejected"
        ? "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20"
        : status === "selesai"
          ? "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20"
          : "bg-[#EAF7FB] text-[#016273] ring-1 ring-inset ring-[#016273]/20";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}
    >
      {statusLabels[status]}
    </span>
  );
}

function PanelMessage({ text }: { text: string }) {
  return (
    <p className="flex min-h-56 items-center justify-center bg-[#EAF7FB]/20 px-6 text-center text-sm text-[#5a737e]">
      {text}
    </p>
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

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
