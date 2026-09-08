"use client";

import Link from "next/link";
import { useState } from "react";
import AdminDialog from "../../admin/components/admin-dialog";
import MediaList from "../../admin/components/media-list";
import StatCard from "../../admin/components/stat-card";
import { useProjectManagerDashboard } from "../../hooks/use-project-manager-dashboard";
import {
  approveActivity,
  rejectActivity,
  type Activity,
  type ActivityStatus,
} from "../../services/activity-service";
import type { EmployeeActivitySummary } from "../../services/project-manager-dashboard-service";

const statusLabels: Record<ActivityStatus, string> = {
  pending: "Pending",
  ongoing: "Berjalan",
  selesai: "Menunggu Validasi",
  approved: "Disetujui",
  rejected: "Perlu Revisi",
};

export default function ProjectManagerDashboard() {
  const { data, isLoading, fatalError, refetch } =
    useProjectManagerDashboard();
  const [review, setReview] = useState<{
    activity: Activity;
    action: "approve" | "reject";
  } | null>(null);
  const [feedback, setFeedback] = useState("");
  const resources = data ? Object.values(data) : [];
  const hasPartialError =
    Boolean(fatalError) || resources.some((resource) => resource.error !== null);

  function finishReview(message: string) {
    setReview(null);
    setFeedback(message);
    refetch();
  }

  return (
    <main className="space-y-6 p-4 sm:p-7" aria-busy={isLoading}>
      <header>
        <h1 className="text-2xl font-bold text-[#030303]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#5a737e]">
          Ringkasan proyek, penugasan tim, dan antrian validasi aktivitas.
        </p>
      </header>

      {hasPartialError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>Sebagian data dashboard belum dapat dimuat.</span>
          <button
            type="button"
            onClick={refetch}
            className="self-start font-semibold underline sm:self-auto"
          >
            Coba lagi
          </button>
        </div>
      )}
      {feedback && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {feedback}
        </p>
      )}

      {/* KPI Cards */}
      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Ringkasan Project Manager"
      >
        <StatCard
          title="Total Proyek"
          value={metric(data?.totalProjects.data, isLoading)}
          detail={detail(
            data?.totalProjects.error,
            isLoading,
            "Proyek dalam tanggung jawab Anda",
          )}
          icon="project"
          tone="teal"
        />
        <StatCard
          title="Anggota Tim"
          value={metric(data?.activeMembers.data, isLoading)}
          detail={detail(
            data?.activeMembers.error,
            isLoading,
            "Karyawan unik dengan penugasan aktif",
          )}
          icon="users"
          tone="blue"
        />
        <StatCard
          title="Menunggu Validasi"
          value={metric(data?.awaitingReview.data, isLoading)}
          detail={detail(
            data?.awaitingReview.error,
            isLoading,
            "Aktivitas tim perlu ditinjau",
          )}
          icon="shield"
          tone="yellow"
        />
        <StatCard
          title="Aktivitas Hari Ini"
          value={metric(data?.todayActivities.data, isLoading)}
          detail={detail(
            data?.todayActivities.error,
            isLoading,
            "Log aktivitas masuk hari ini",
          )}
          icon="activity"
          tone="green"
        />
      </section>

      {/* Main Grid: Validation Queue + Employee Summary */}
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,1fr)]">
        <ValidationQueue
          activities={data?.validationQueue.data?.activities ?? null}
          total={data?.validationQueue.data?.total ?? null}
          loading={isLoading}
          error={Boolean(data?.validationQueue.error ?? fatalError)}
          onReview={(activity, action) => setReview({ activity, action })}
        />
        <EmployeeSummary
          summaries={data?.employeeSummaries.data ?? null}
          loading={isLoading}
          error={Boolean(data?.employeeSummaries.error ?? fatalError)}
        />
      </section>

      {/* Today's Activity Feed */}
      <TodayActivities
        activities={data?.dailyActivities.data ?? null}
        loading={isLoading}
        error={Boolean(data?.dailyActivities.error ?? fatalError)}
      />

      {/* Review Dialog */}
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

function ValidationQueue({
  activities,
  total,
  loading,
  error,
  onReview,
}: {
  activities: Activity[] | null;
  total: number | null;
  loading: boolean;
  error: boolean;
  onReview: (activity: Activity, action: "approve" | "reject") => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#d0e6ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <header className="flex items-center justify-between gap-3 border-b border-[#d0e6ed] px-5 py-4 sm:px-6">
        <h2 className="text-base font-bold text-[#030303]">
          Antrian Validasi
        </h2>
        {!loading && !error && (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
            {total ?? 0} Menunggu
          </span>
        )}
      </header>
      <div className="space-y-3.5 p-4 sm:p-5">
        {loading ? (
          <PanelMessage text="Memuat antrian validasi..." />
        ) : error ? (
          <PanelMessage text="Antrian validasi tidak tersedia." />
        ) : !activities?.length ? (
          <PanelMessage text="Tidak ada aktivitas yang menunggu validasi." />
        ) : (
          activities.map((activity) => (
            <article
              key={activity.id}
              className="rounded-2xl border border-[#d0e6ed] bg-[#fcfdfe] p-4 transition-colors hover:bg-[#EAF7FB]/40"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#016273] text-xs font-bold text-white shadow-xs">
                    {initials(activity.user.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#030303]">
                      {activity.user.name}
                    </p>
                    {activity.task && (
                      <p className="mt-0.5 truncate text-xs font-semibold text-[#016273]">
                        Tugas: {activity.task.title}
                      </p>
                    )}
                    <p className="mt-0.5 truncate text-sm font-medium text-[#475569]">
                      {activity.title}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#5a737e]">
                      <span>{activity.project?.name ?? "Tanpa proyek"}</span>
                      <span>•</span>
                      <span>{formatDate(activity.activity_date)}</span>
                    </div>
                    {activity.media.length > 0 && (
                      <div className="mt-3">
                        <MediaList items={activity.media} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => onReview(activity, "approve")}
                    className="rounded-xl bg-[#016273] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#014d5a]"
                    aria-label={`Setujui aktivitas ${activity.title}`}
                  >
                    Setujui
                  </button>
                  <button
                    type="button"
                    onClick={() => onReview(activity, "reject")}
                    className="rounded-xl border border-[#d0e6ed] bg-white px-3.5 py-2 text-xs font-semibold text-[#5a737e] transition-colors hover:bg-[#EAF7FB] hover:text-[#016273]"
                    aria-label={`Minta revisi aktivitas ${activity.title}`}
                  >
                    Minta Revisi
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
      <footer className="border-t border-[#d0e6ed] bg-[#fcfdfe] px-5 py-3 text-right">
        <Link
          href="/project-manager/activities"
          className="text-xs font-semibold text-[#016273] hover:underline"
        >
          Lihat Semua Aktivitas &rarr;
        </Link>
      </footer>
    </section>
  );
}

function EmployeeSummary({
  summaries,
  loading,
  error,
}: {
  summaries: EmployeeActivitySummary[] | null;
  loading: boolean;
  error: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#d0e6ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <header className="border-b border-[#d0e6ed] px-5 py-4 sm:px-6">
        <h2 className="text-base font-bold text-[#030303]">
          Ringkasan Aktivitas Tim
        </h2>
      </header>
      <div className="space-y-4 p-5 sm:p-6">
        {loading ? (
          <PanelMessage text="Memuat ringkasan karyawan..." />
        ) : error ? (
          <PanelMessage text="Ringkasan karyawan tidak tersedia." />
        ) : !summaries?.length ? (
          <PanelMessage text="Belum ada aktivitas karyawan pada proyek Anda." />
        ) : (
          summaries.slice(0, 5).map((summary) => (
            <article
              key={summary.userId}
              className="flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-[#EAF7FB]/40"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#016273] text-xs font-bold text-white">
                {initials(summary.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#030303]">
                      {summary.name}
                    </p>
                    <p className="text-xs text-[#5a737e]">
                      {summary.division ?? "Tanpa divisi"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-[#5a737e]">
                    {summary.total} aktivitas
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    {summary.approved} disetujui
                  </span>
                  <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-amber-700 ring-1 ring-inset ring-amber-600/20">
                    {summary.awaitingReview} menunggu
                  </span>
                  <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-rose-700 ring-1 ring-inset ring-rose-600/20">
                    {summary.rejected} revisi
                  </span>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function TodayActivities({
  activities,
  loading,
  error,
}: {
  activities: Activity[] | null;
  loading: boolean;
  error: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#d0e6ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <header className="border-b border-[#d0e6ed] px-5 py-4 sm:px-6">
        <h2 className="text-base font-bold text-[#030303]">
          Aktivitas Masuk Hari Ini
        </h2>
      </header>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-left text-sm">
          <thead className="border-b border-[#d0e6ed] bg-[#EAF7FB] text-xs font-semibold uppercase tracking-wider text-[#030303]">
            <tr>
              <th className="px-5 py-3.5">Karyawan</th>
              <th className="px-4 py-3.5">Divisi</th>
              <th className="px-4 py-3.5">Aktivitas</th>
              <th className="px-4 py-3.5">Proyek</th>
              <th className="px-4 py-3.5">Tanggal</th>
              <th className="px-5 py-3.5 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#d0e6ed]">
            {loading ? (
              <TableMessage text="Memuat aktivitas hari ini..." />
            ) : error ? (
              <TableMessage text="Aktivitas hari ini tidak tersedia." />
            ) : !activities?.length ? (
              <TableMessage text="Belum ada aktivitas yang dicatat hari ini." />
            ) : (
              activities.map((activity) => (
                <tr
                  key={activity.id}
                  className="transition-colors hover:bg-[#EAF7FB]/40"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#016273] text-[10px] font-bold text-white">
                        {initials(activity.user.name)}
                      </span>
                      <span className="font-semibold text-[#030303]">
                        {activity.user.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-xs text-[#5a737e]">
                    {activity.user.division?.name ?? "—"}
                  </td>
                  <td className="px-4 py-4 font-medium text-[#030303]">
                    {activity.title}
                  </td>
                  <td className="px-4 py-4 text-xs text-[#5a737e]">
                    {activity.project?.name ?? "—"}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-xs text-[#5a737e]">
                    {formatDate(activity.activity_date)}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-center">
                    <StatusBadge status={activity.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
  action: "approve" | "reject";
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const revising = action === "reject";
  const errorId = `dashboard-activity-${activity.id}-review-error`;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (revising && !reason.trim()) {
      setMessage("Alasan revisi wajib diisi.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const response = revising
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
      title={revising ? "Minta Revisi Aktivitas" : "Setujui Aktivitas"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
        {revising ? (
          <div className="space-y-1 text-xs text-[#5a737e] sm:text-sm">
            <p className="font-semibold text-[#030303]">
              Minta perbaikan untuk aktivitas:
            </p>
            <p className="font-medium text-[#030303]">
              &ldquo;{activity.title}&rdquo; ({activity.user.name})
            </p>
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
            Alasan Revisi
            <textarea
              required
              maxLength={1000}
              rows={4}
              value={reason}
              placeholder="Tuliskan catatan atau instruksi perbaikan untuk karyawan..."
              aria-invalid={Boolean(message)}
              aria-describedby={message ? errorId : undefined}
              onChange={(event) => {
                setReason(event.target.value);
                if (message) setMessage("");
              }}
              className="mt-1.5 w-full rounded-xl border border-[#c8dfe8] p-3 text-xs font-normal text-[#030303] outline-none focus:border-[#016273] focus:ring-2 focus:ring-[#016273]/20"
            />
          </label>
        )}

        {message && (
          <p id={errorId} role="alert" className="text-xs text-red-600">
            {message}
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
            className={`rounded-xl px-5 py-2 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-60 ${
              revising
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-[#016273] hover:bg-[#014d5a]"
            }`}
          >
            {saving
              ? "Memproses..."
              : revising
                ? "Kirim Permintaan Revisi"
                : "Setujui Aktivitas"}
          </button>
        </div>
      </form>
    </AdminDialog>
  );
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
    <p className="flex min-h-44 items-center justify-center px-4 text-center text-sm text-[#5a737e]">
      {text}
    </p>
  );
}

function TableMessage({ text }: { text: string }) {
  return (
    <tr>
      <td colSpan={6} className="px-6 py-16 text-center text-sm text-[#5a737e]">
        {text}
      </td>
    </tr>
  );
}

function metric(
  value: number | null | undefined,
  loading: boolean,
): number | string {
  return loading || value === null || value === undefined ? "—" : value;
}

function detail(error: unknown, loading: boolean, text: string) {
  if (loading) return "Memuat data...";
  return error ? "Data tidak tersedia" : text;
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
