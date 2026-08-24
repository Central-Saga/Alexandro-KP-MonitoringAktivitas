"use client";

import { useEffect, useMemo, useState } from "react";
import {
  approveActivity,
  rejectActivity,
  type Activity,
  type ActivityStatus,
} from "../../services/activity-service";
import { useActivities } from "../../hooks/use-activities";
import { getDivisions, type Division } from "../../services/division-service";
import type { PaginationMeta } from "../../services/user-service";
import AdminDialog from "./admin-dialog";
import { AdminIcon } from "./admin-icons";
import ActivityStatusDistribution from "./activity-status-distribution";
import MediaList from "./media-list";
import StatCard from "./stat-card";

const days = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const statusLabels: Record<ActivityStatus, string> = {
  pending: "Menunggu Validasi",
  ongoing: "Berjalan",
  selesai: "Menunggu Validasi",
  approved: "Disetujui",
  rejected: "Perlu Revisi",
};

const statusBadgeTones: Record<ActivityStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  ongoing: "bg-blue-100 text-blue-700",
  selesai: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function ActivityMonitoring() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ActivityStatus | "">("");
  const [divisionId, setDivisionId] = useState<number | undefined>();
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [page, setPage] = useState(1);
  const [review, setReview] = useState<{ activity: Activity; action: "approve" | "reject" } | null>(null);
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
    void getDivisions({ page: 1, perPage: 100 })
      .then((response) => {
        if (active) setDivisions(response.data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const {
    data: activities,
    meta,
    isLoading,
    error,
    refetch,
  } = useActivities({
    search: search || undefined,
    status: status || undefined,
    divisionId,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    page,
    perPage: 10,
  });

  const metrics = useMemo(() => getMonitoringMetrics(activities), [activities]);

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setDivisionId(undefined);
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    searchInput || status || divisionId !== undefined || dateFrom || dateTo,
  );

  return (
    <main className="space-y-4 p-4 sm:space-y-5 sm:p-6">
      <header className="flex flex-col gap-0.5">
        <h2 className="text-xl font-bold text-[#172b4d] sm:text-2xl">
          Monitoring Aktivitas
        </h2>
        <p className="text-xs text-[#71829a] sm:text-sm">
          Pantau aktivitas dan proses validasi karyawan.
        </p>
      </header>

      {Boolean(error) && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <span>Data monitoring aktivitas belum dapat dimuat.</span>
          <button
            type="button"
            onClick={refetch}
            className="font-semibold underline"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* 1. Operational KPI Cards */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard
          title="Aktivitas Minggu Ini"
          value={isLoading ? "—" : metrics.weeklyTotal}
          detail="Total minggu ini"
          icon="chart"
          tone="blue"
        />
        <StatCard
          title="Menunggu Validasi"
          value={
            isLoading
              ? "—"
              : (metrics.statusCounts.selesai ?? 0) + (metrics.statusCounts.pending ?? 0)
          }
          detail="Perlu ditinjau reviewer"
          icon="activity"
          tone="yellow"
        />
        <StatCard
          title="Disetujui"
          value={isLoading ? "—" : metrics.statusCounts.approved ?? 0}
          detail="Aktivitas tervalidasi"
          icon="user-check"
          tone="green"
        />
        <StatCard
          title="Perlu Revisi"
          value={isLoading ? "—" : metrics.statusCounts.rejected ?? 0}
          detail="Menunggu perbaikan karyawan"
          icon="user-minus"
          tone="red"
        />
      </section>

      {/* 2. Trend Chart & Status Distribution */}
      <section className="grid gap-4 sm:gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <WeeklyTrend counts={metrics.weeklyCounts} />
        <ActivityStatusDistribution
          counts={metrics.statusCounts}
          total={activities.length}
        />
      </section>

      {success && (
        <div
          role="status"
          className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          <span>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess("")}
            className="text-xs font-semibold text-green-700 hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* 3. Review Activities Table */}
      <ActivityReviewTable
        activities={activities}
        meta={meta}
        loading={isLoading}
        search={searchInput}
        status={status}
        divisionId={divisionId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        divisions={divisions}
        hasActiveFilters={hasActiveFilters}
        onSearch={setSearchInput}
        onStatus={(value) => {
          setStatus(value);
          setPage(1);
        }}
        onDivision={(value) => {
          setDivisionId(value);
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
        onResetFilters={resetFilters}
        onPage={setPage}
        onReview={(activity, action) => setReview({ activity, action })}
      />

      {review && (
        <ReviewDialog
          activity={review.activity}
          action={review.action}
          onClose={() => setReview(null)}
          onSuccess={(msg) => {
            setReview(null);
            setSuccess(msg);
            refetch();
          }}
        />
      )}
    </main>
  );
}

function WeeklyTrend({ counts }: { counts: number[] }) {
  const total = counts.reduce((sum, count) => sum + count, 0);
  const maximum = Math.max(...counts, 1);

  return (
    <section className="rounded-2xl border border-[#dce4ec] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      <header className="flex items-center justify-between border-b border-[#e1e7ee] px-5 py-4">
        <h2 className="text-sm font-bold text-[#172b4d]">Tren Aktivitas Mingguan</h2>
        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-[#2f9e44]">
          Senin – Minggu
        </span>
      </header>
      <div className="p-5">
        <div className="grid h-28 grid-cols-7 items-end gap-2 sm:gap-3">
          {counts.map((count, index) => (
            <div key={days[index]} className="flex h-full flex-col justify-end">
              <div className="flex h-[76px] items-end rounded-t-md bg-green-50">
                <div
                  className="w-full rounded-t-md bg-[#43a956] transition-all duration-300"
                  style={{
                    height: total
                      ? `${Math.max((count / maximum) * 100, count ? 10 : 0)}%`
                      : "0%",
                  }}
                  title={`${count} aktivitas`}
                />
              </div>
              <span className="mt-1.5 text-center text-xs text-[#60738f]">
                {days[index]}
              </span>
            </div>
          ))}
        </div>
        {total === 0 && (
          <p className="mt-2 text-center text-xs text-[#71829a]">
            Belum ada aktivitas pada minggu ini.
          </p>
        )}
      </div>
    </section>
  );
}

function getMonitoringMetrics(activities: Activity[]) {
  const now = new Date();
  const currentDay = now.getDay() || 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - currentDay + 1);

  const weekDates = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return localDateKey(date);
  });

  const weeklyCounts = weekDates.map(
    (date) =>
      activities.filter(
        (activity) => activity.activity_date.slice(0, 10) === date,
      ).length,
  );

  const statusCounts: Record<ActivityStatus, number> = {
    pending: 0,
    ongoing: 0,
    selesai: 0,
    approved: 0,
    rejected: 0,
  };

  activities.forEach((activity) => {
    if (activity.status in statusCounts) {
      statusCounts[activity.status] += 1;
    }
  });

  return {
    weeklyCounts,
    weeklyTotal: weeklyCounts.reduce((sum, count) => sum + count, 0),
    statusCounts,
  };
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type ActivityReviewTableProps = {
  activities: Activity[];
  meta: PaginationMeta | null;
  loading: boolean;
  search: string;
  status: ActivityStatus | "";
  divisionId?: number;
  dateFrom: string;
  dateTo: string;
  divisions: Division[];
  hasActiveFilters: boolean;
  onSearch: (value: string) => void;
  onStatus: (value: ActivityStatus | "") => void;
  onDivision: (value?: number) => void;
  onDateFrom: (value: string) => void;
  onDateTo: (value: string) => void;
  onResetFilters: () => void;
  onPage: (page: number) => void;
  onReview: (activity: Activity, action: "approve" | "reject") => void;
};

function ActivityReviewTable({
  activities,
  meta,
  loading,
  search,
  status,
  divisionId,
  dateFrom,
  dateTo,
  divisions,
  hasActiveFilters,
  onSearch,
  onStatus,
  onDivision,
  onDateFrom,
  onDateTo,
  onResetFilters,
  onPage,
  onReview,
}: ActivityReviewTableProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      <header className="flex flex-col gap-1 border-b border-[#e1e7ee] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-[#172b4d]">Aktivitas Karyawan</h2>
          <p className="text-xs text-[#71829a]">
            Pantau dan verifikasi aktivitas harian seluruh karyawan
          </p>
        </div>
        {meta && (
          <span className="text-xs text-[#71829a]">
            Total {meta.total} aktivitas ditemukan
          </span>
        )}
      </header>

      {/* Filter Bar */}
      <div className="grid gap-2.5 border-b border-[#e1e7ee] bg-[#fafbfc] p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="relative sm:col-span-2 lg:col-span-2">
          <AdminIcon
            name="search"
            className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#91a0b3]"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            aria-label="Cari judul atau karyawan"
            placeholder="Cari aktivitas atau karyawan..."
            className="h-10 w-full rounded-xl border border-[#dce4ec] bg-white pl-10 pr-3 text-xs outline-none focus:border-[#43a956]"
          />
        </label>

        <select
          value={status}
          onChange={(event) => onStatus(event.target.value as ActivityStatus | "")}
          aria-label="Filter status"
          className="h-10 rounded-xl border border-[#dce4ec] bg-white px-3 text-xs outline-none focus:border-[#43a956]"
        >
          <option value="">Semua Status</option>
          <option value="selesai">Menunggu Validasi</option>
          <option value="approved">Disetujui</option>
          <option value="rejected">Perlu Revisi</option>
          <option value="ongoing">Berjalan</option>
        </select>

        <select
          value={divisionId ?? ""}
          onChange={(event) =>
            onDivision(event.target.value ? Number(event.target.value) : undefined)
          }
          aria-label="Filter divisi"
          className="h-10 rounded-xl border border-[#dce4ec] bg-white px-3 text-xs outline-none focus:border-[#43a956]"
        >
          <option value="">Semua Divisi</option>
          {divisions.map((division) => (
            <option key={division.id} value={division.id}>
              {division.name}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1.5 sm:col-span-2 lg:col-span-1">
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => onDateFrom(event.target.value)}
            aria-label="Tanggal mulai"
            title="Tanggal mulai"
            className="h-10 w-full rounded-xl border border-[#dce4ec] bg-white px-2.5 text-xs outline-none focus:border-[#43a956]"
          />
          <span className="text-xs text-[#91a0b3]">-</span>
          <input
            type="date"
            value={dateTo}
            onChange={(event) => onDateTo(event.target.value)}
            aria-label="Tanggal akhir"
            title="Tanggal akhir"
            className="h-10 w-full rounded-xl border border-[#dce4ec] bg-white px-2.5 text-xs outline-none focus:border-[#43a956]"
          />
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              title="Reset filter"
              className="flex h-10 shrink-0 items-center justify-center rounded-xl border border-[#dce4ec] bg-white px-3 text-xs font-semibold text-[#60738f] hover:bg-slate-50"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Review Table (7 Columns) */}
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-xs sm:text-sm">
          <thead className="bg-[#f1f4f8] text-[#60738f]">
            <tr>
              <th className="px-4 py-3 font-semibold">Karyawan</th>
              <th className="px-4 py-3 font-semibold">Divisi</th>
              <th className="px-4 py-3 font-semibold">Aktivitas</th>
              <th className="px-4 py-3 font-semibold">Proyek</th>
              <th className="px-4 py-3 font-semibold">Tanggal</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-center font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <MessageRow message="Memuat aktivitas..." />
            ) : activities.length === 0 ? (
              <MessageRow message="Tidak ada aktivitas yang cocok." />
            ) : (
              activities.map((activity) => {
                const eligible =
                  activity.status === "selesai" ||
                  activity.status === "pending" ||
                  activity.status === "approved" ||
                  activity.status === "rejected";

                return (
                  <tr
                    key={activity.id}
                    className="border-b border-[#e1e7ee] last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3.5 font-semibold text-[#172b4d]">
                      {activity.user?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#71829a]">
                      {activity.user?.division?.name ?? "—"}
                    </td>
                    <td className="max-w-xs px-4 py-3.5">
                      <p className="font-medium text-[#172b4d]">{activity.title}</p>
                      {activity.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-[#71829a]">
                          {activity.description}
                        </p>
                      )}
                      <MediaList items={activity.media} />
                      {activity.status === "rejected" && activity.rejection_reason && (
                        <p className="mt-1 rounded bg-red-50 p-1.5 text-xs text-red-700">
                          <span className="font-semibold">Revisi:</span>{" "}
                          {activity.rejection_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs font-medium text-[#60738f]">
                      {activity.project?.name ?? "Tanpa proyek"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#71829a]">
                      {formatDate(activity.activity_date)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          statusBadgeTones[activity.status] ??
                          "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {statusLabels[activity.status] ?? activity.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {eligible && activity.status !== "approved" && (
                          <button
                            type="button"
                            onClick={() => onReview(activity, "approve")}
                            className="rounded-lg border border-green-300 bg-green-50/60 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-100"
                          >
                            Setujui
                          </button>
                        )}
                        {eligible && activity.status !== "rejected" && (
                          <button
                            type="button"
                            onClick={() => onReview(activity, "reject")}
                            className="rounded-lg border border-red-300 bg-red-50/60 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                          >
                            Tolak
                          </button>
                        )}
                        {!eligible && (
                          <span className="text-xs text-[#91a0b3]">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {meta && (
        <footer className="flex flex-col gap-3 border-t border-[#e1e7ee] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[#71829a]">
            Menampilkan {meta.from ?? 0}–{meta.to ?? 0} dari {meta.total} aktivitas
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading || meta.current_page <= 1}
              onClick={() => onPage(meta.current_page - 1)}
              className="rounded-lg border border-[#dce4ec] bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <span className="flex items-center px-2 text-xs font-semibold text-[#172b4d]">
              {meta.current_page} / {meta.last_page}
            </span>
            <button
              type="button"
              disabled={loading || meta.current_page >= meta.last_page}
              onClick={() => onPage(meta.current_page + 1)}
              className="rounded-lg border border-[#dce4ec] bg-white px-3 py-1.5 text-xs font-medium disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </footer>
      )}
    </section>
  );
}

function MessageRow({ message }: { message: string }) {
  return (
    <tr>
      <td colSpan={7} className="px-6 py-12 text-center text-[#71829a]">
        {message}
      </td>
    </tr>
  );
}

function formatDate(value: string) {
  if (!value) return "—";
  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return "—";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function ReviewDialog({
  activity,
  action,
  onClose,
  onSuccess,
}: {
  activity: Activity;
  action: "approve" | "reject";
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const rejecting = action === "reject";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rejecting && !reason.trim()) {
      setMessage("Alasan penolakan wajib diisi.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const response = rejecting
        ? await rejectActivity(activity.id, reason.trim())
        : await approveActivity(activity.id);
      onSuccess(response.message);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Keputusan gagal disimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminDialog
      title={rejecting ? "Tolak Aktivitas" : "Setujui Aktivitas"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
        <p className="text-sm text-[#60738f]">
          {rejecting ? "Tolak" : "Setujui"} aktivitas{" "}
          <strong className="text-[#172b4d]">{activity.title}</strong> milik{" "}
          {activity.user.name}?
        </p>
        {rejecting && (
          <label
            htmlFor="rejection-reason"
            className="block text-sm font-semibold text-[#172b4d]"
          >
            Alasan Penolakan
            <textarea
              id="rejection-reason"
              required
              maxLength={1000}
              rows={4}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              aria-invalid={Boolean(message && !reason.trim())}
              placeholder="Jelaskan alasan penolakan dan instruksi revisi..."
              className="mt-2 w-full rounded-xl border border-[#dce4ec] p-3 text-sm font-normal outline-none focus:border-red-500"
            />
          </label>
        )}
        {message && (
          <p role="alert" className="text-sm text-red-600">
            {message}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#dce4ec] px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
              rejecting ? "bg-red-600 hover:bg-red-700" : "bg-[#18a84f] hover:bg-green-700"
            }`}
          >
            {saving ? "Memproses..." : rejecting ? "Tolak" : "Setujui"}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
}
