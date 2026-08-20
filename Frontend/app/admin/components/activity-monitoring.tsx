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
import EmployeePerformanceTable, {
  type EmployeeActivitySummary,
} from "./employee-performance-table";
import StatCard from "./stat-card";

const days = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export default function ActivityMonitoring() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ActivityStatus | "">("");
  const [divisionId, setDivisionId] = useState<number | undefined>();
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [page, setPage] = useState(1);
  const [review, setReview] = useState<{ activity: Activity; action: "approve" | "reject" } | null>(null);
  const [success, setSuccess] = useState("");
  useEffect(() => { const timeout = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350); return () => window.clearTimeout(timeout); }, [searchInput]);
  useEffect(() => { let active = true; void getDivisions({ page: 1, perPage: 100 }).then((response) => { if (active) setDivisions(response.data); }).catch(() => undefined); return () => { active = false; }; }, []);
  // Query monitoring menggunakan filter backend agar hasil dan pagination
  // tidak terbatas pada collection yang sudah ada di browser.
  const { data: activities, meta, isLoading, error, refetch } = useActivities({ search: search || undefined, status: status || undefined, divisionId, page, perPage: 10 });

  const metrics = useMemo(() => getMonitoringMetrics(activities), [activities]);
  const approvalRate = activities.length
    ? Math.round((metrics.statusCounts.approved / activities.length) * 100)
    : null;

  return (
    <main className="space-y-6 p-4 sm:p-7">
      <header>
        <h2 className="text-2xl font-bold text-[#172b4d]">
          Monitoring Aktivitas
        </h2>
        <p className="mt-1 text-sm text-[#71829a] sm:text-base">
          Pantau performa seluruh karyawan secara real-time
        </p>
      </header>

      {Boolean(error) && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Data monitoring aktivitas belum dapat dimuat.
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Aktivitas Minggu Ini"
          value={isLoading ? "—" : metrics.weeklyTotal}
          detail="Berdasarkan activity_date"
          icon="project"
          tone="green"
        />
        <StatCard
          title="Tingkat Persetujuan"
          value={isLoading || approvalRate === null ? "—" : `${approvalRate}%`}
          detail="Approved pada halaman ini"
          icon="shield"
          tone="blue"
        />
        <StatCard
          title="Total Jam Kerja"
          value="—"
          detail="Field waktu belum tersedia"
          icon="activity"
          tone="yellow"
        />
        <StatCard
          title="Karyawan Aktif"
          value="—"
          detail="Endpoint user belum tersedia"
          icon="users"
          tone="red"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <WeeklyTrend counts={metrics.weeklyCounts} />
        <ActivityStatusDistribution
          counts={metrics.statusCounts}
          total={activities.length}
        />
      </section>

      {success && <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</p>}
      <ActivityReviewTable activities={activities} meta={meta} loading={isLoading} search={searchInput} status={status} divisionId={divisionId} divisions={divisions} onSearch={setSearchInput} onStatus={(value) => { setStatus(value); setPage(1); }} onDivision={(value) => { setDivisionId(value); setPage(1); }} onPage={setPage} onReview={(activity, action) => setReview({ activity, action })} />

      <EmployeePerformanceTable
        monthLabel={metrics.monthLabel}
        employees={metrics.employeeSummaries}
      />
      {review && <ReviewDialog activity={review.activity} action={review.action} onClose={() => setReview(null)} onSuccess={(message) => { setReview(null); setSuccess(message); refetch(); }} />}
    </main>
  );
}

function WeeklyTrend({ counts }: { counts: number[] }) {
  const total = counts.reduce((sum, count) => sum + count, 0);
  const maximum = Math.max(...counts, 1);

  return (
    <section className="rounded-2xl border border-[#dce4ec] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      <header className="border-b border-[#e1e7ee] px-6 py-5">
        <h2 className="font-bold text-[#172b4d]">Tren Aktivitas Mingguan</h2>
      </header>
      <div className="p-6">
        <div className="grid h-40 grid-cols-7 items-end gap-2 sm:gap-3">
          {counts.map((count, index) => (
            <div key={days[index]} className="flex h-full flex-col justify-end">
              <div className="flex h-[118px] items-end rounded-t-md bg-green-50">
                <div
                  className="w-full rounded-t-md bg-[#18a84f] transition-[height]"
                  style={{
                    height: total
                      ? `${Math.max((count / maximum) * 100, count ? 8 : 0)}%`
                      : "0%",
                  }}
                  title={`${count} aktivitas`}
                />
              </div>
              <span className="mt-2 text-center text-xs text-[#60738f]">
                {days[index]}
              </span>
            </div>
          ))}
        </div>
        {total === 0 && (
          <p className="mt-3 text-center text-sm text-[#71829a]">
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

  const currentMonth = localDateKey(now).slice(0, 7);
  const employeeMap = new Map<number, EmployeeActivitySummary>();
  activities
    .filter((activity) => activity.activity_date.slice(0, 7) === currentMonth)
    .forEach((activity) => {
      const current = employeeMap.get(activity.user_id) ?? {
        userId: activity.user_id,
        name: activity.user.name,
        division: activity.user.division?.name ?? null,
        total: 0,
        approved: 0,
      };
      current.total += 1;
      current.approved += activity.status === "approved" ? 1 : 0;
      employeeMap.set(activity.user_id, current);
    });

  return {
    weeklyCounts,
    weeklyTotal: weeklyCounts.reduce((sum, count) => sum + count, 0),
    statusCounts,
    employeeSummaries: Array.from(employeeMap.values()).sort(
      (left, right) => right.total - left.total,
    ),
    monthLabel: new Intl.DateTimeFormat("id-ID", {
      month: "long",
      year: "numeric",
    }).format(now),
  };
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const statusLabels: Record<ActivityStatus, string> = { pending: "Menunggu", ongoing: "Berjalan", selesai: "Selesai", approved: "Disetujui", rejected: "Ditolak" };

function ActivityReviewTable({ activities, meta, loading, search, status, divisionId, divisions, onSearch, onStatus, onDivision, onPage, onReview }: { activities: Activity[]; meta: PaginationMeta | null; loading: boolean; search: string; status: ActivityStatus | ""; divisionId?: number; divisions: Division[]; onSearch: (value: string) => void; onStatus: (value: ActivityStatus | "") => void; onDivision: (value?: number) => void; onPage: (page: number) => void; onReview: (activity: Activity, action: "approve" | "reject") => void }) {
  return <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.05)]"><header className="border-b border-[#e1e7ee] px-6 py-5"><h2 className="font-bold text-[#172b4d]">Review Aktivitas</h2><p className="mt-1 text-xs text-[#71829a]">Statistik di atas dihitung dari halaman hasil saat ini.</p></header><div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-6"><label className="relative"><AdminIcon name="search" className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#91a0b3]" /><input type="search" value={search} onChange={(event) => onSearch(event.target.value)} aria-label="Cari judul atau karyawan" placeholder="Cari aktivitas atau karyawan..." className="h-11 w-full rounded-xl border border-[#dce4ec] pl-11 pr-3 text-sm" /></label><select value={status} onChange={(event) => onStatus(event.target.value as ActivityStatus | "")} aria-label="Filter status" className="h-11 rounded-xl border border-[#dce4ec] bg-white px-3 text-sm"><option value="">Semua Status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select value={divisionId ?? ""} onChange={(event) => onDivision(event.target.value ? Number(event.target.value) : undefined)} aria-label="Filter divisi" className="h-11 rounded-xl border border-[#dce4ec] bg-white px-3 text-sm"><option value="">Semua Divisi</option>{divisions.map((division) => <option key={division.id} value={division.id}>{division.name}</option>)}</select></div><div className="max-w-full overflow-x-auto px-4 pb-4 sm:px-6"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[#f1f4f8] text-[#60738f]"><tr><th className="px-4 py-3">Karyawan</th><th className="px-4 py-3">Divisi</th><th className="px-4 py-3">Aktivitas</th><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-center">Aksi</th></tr></thead><tbody>{loading ? <MessageRow message="Memuat aktivitas..." /> : activities.length === 0 ? <MessageRow message="Tidak ada aktivitas yang cocok." /> : activities.map((activity) => { const eligible = activity.status === "selesai" || activity.status === "approved" || activity.status === "rejected"; return <tr key={activity.id} className="border-b border-[#e1e7ee]"><td className="px-4 py-4 font-medium text-[#172b4d]">{activity.user.name}</td><td className="px-4 py-4 text-[#71829a]">{activity.user.division?.name ?? "—"}</td><td className="px-4 py-4"><p className="font-medium text-[#172b4d]">{activity.title}</p><p className="text-xs text-[#71829a]">{activity.project?.name ?? "Tanpa proyek"}</p></td><td className="px-4 py-4 text-[#71829a]">{new Date(activity.activity_date).toLocaleDateString("id-ID")}</td><td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{statusLabels[activity.status]}</span></td><td className="px-4 py-4"><div className="flex justify-center gap-2">{eligible && activity.status !== "approved" && <button type="button" onClick={() => onReview(activity, "approve")} className="rounded-lg border border-green-300 px-3 py-2 text-xs font-semibold text-green-700">Setujui</button>}{eligible && activity.status !== "rejected" && <button type="button" onClick={() => onReview(activity, "reject")} className="rounded-lg border border-red-300 px-3 py-2 text-xs font-semibold text-red-600">Tolak</button>}{!eligible && <span className="text-xs text-[#91a0b3]">Belum siap direview</span>}</div></td></tr>; })}</tbody></table></div>{meta && <footer className="flex flex-col gap-3 border-t border-[#e1e7ee] px-6 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-[#71829a]">{meta.from ?? 0}–{meta.to ?? 0} dari {meta.total} aktivitas</p><div className="flex gap-2"><button type="button" disabled={loading || meta.current_page <= 1} onClick={() => onPage(meta.current_page - 1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Sebelumnya</button><button type="button" disabled={loading || meta.current_page >= meta.last_page} onClick={() => onPage(meta.current_page + 1)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">Berikutnya</button></div></footer>}</section>;
}

function MessageRow({ message }: { message: string }) { return <tr><td colSpan={6} className="px-6 py-14 text-center text-[#71829a]">{message}</td></tr>; }

function ReviewDialog({ activity, action, onClose, onSuccess }: { activity: Activity; action: "approve" | "reject"; onClose: () => void; onSuccess: (message: string) => void }) {
  const [reason, setReason] = useState(""); const [saving, setSaving] = useState(false); const [message, setMessage] = useState(""); const rejecting = action === "reject";
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); if (rejecting && !reason.trim()) { setMessage("Alasan penolakan wajib diisi."); return; } setSaving(true); setMessage(""); try { const response = rejecting ? await rejectActivity(activity.id, reason.trim()) : await approveActivity(activity.id); onSuccess(response.message); } catch (error) { setMessage(error instanceof Error ? error.message : "Keputusan gagal disimpan."); } finally { setSaving(false); } }
  return <AdminDialog title={rejecting ? "Tolak Aktivitas" : "Setujui Aktivitas"} onClose={onClose}><form onSubmit={submit} className="space-y-4 p-5 sm:p-6"><p className="text-sm text-[#60738f]">{rejecting ? "Tolak" : "Setujui"} aktivitas <strong className="text-[#172b4d]">{activity.title}</strong> milik {activity.user.name}?</p>{rejecting && <label htmlFor="rejection-reason" className="block text-sm font-semibold text-[#172b4d]">Alasan Penolakan<textarea id="rejection-reason" required maxLength={1000} rows={4} value={reason} onChange={(event) => setReason(event.target.value)} aria-invalid={Boolean(message && !reason.trim())} className="mt-2 w-full rounded-xl border border-[#dce4ec] p-3 font-normal" /></label>}{message && <p role="alert" className="text-sm text-red-600">{message}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">Batal</button><button type="submit" disabled={saving} className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${rejecting ? "bg-red-600" : "bg-[#18a84f]"}`}>{saving ? "Memproses..." : rejecting ? "Tolak" : "Setujui"}</button></div></form></AdminDialog>;
}
