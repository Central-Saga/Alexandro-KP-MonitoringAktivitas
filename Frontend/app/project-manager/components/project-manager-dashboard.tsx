"use client";

import Link from "next/link";
import { useState } from "react";
import AdminDialog from "../../admin/components/admin-dialog";
import MediaList from "../../admin/components/media-list";
import StatCard from "../../admin/components/stat-card";
import { useProjectManagerDashboard } from "../../hooks/use-project-manager-dashboard";
import { approveActivity, rejectActivity, type Activity, type ActivityStatus } from "../../services/activity-service";
import type { EmployeeActivitySummary } from "../../services/project-manager-dashboard-service";

const statusLabels: Record<ActivityStatus, string> = {
  pending: "Pending", ongoing: "Berjalan", selesai: "Menunggu Validasi", approved: "Disetujui", rejected: "Perlu Revisi",
};

export default function ProjectManagerDashboard() {
  const { data, isLoading, fatalError, refetch } = useProjectManagerDashboard();
  const [review, setReview] = useState<{ activity: Activity; action: "approve" | "reject" } | null>(null);
  const [feedback, setFeedback] = useState("");
  const resources = data ? Object.values(data) : [];
  const hasPartialError = Boolean(fatalError) || resources.some((resource) => resource.error !== null);

  function finishReview(message: string) { setReview(null); setFeedback(message); refetch(); }

  return <main className="space-y-6 p-4 sm:p-7" aria-busy={isLoading}>
    {hasPartialError && <div role="alert" className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between"><span>Sebagian data dashboard belum dapat dimuat.</span><button type="button" onClick={refetch} className="self-start font-semibold underline sm:self-auto">Coba lagi</button></div>}
    {feedback && <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{feedback}</p>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan Project Manager">
      <StatCard title="Total Proyek" value={metric(data?.totalProjects.data, isLoading)} detail={detail(data?.totalProjects.error, isLoading, "Proyek yang Anda kelola")} icon="project" tone="green" />
      <StatCard title="Anggota Tim" value={metric(data?.activeMembers.data, isLoading)} detail={detail(data?.activeMembers.error, isLoading, "Karyawan unik dengan assignment aktif")} icon="users" tone="blue" />
      <StatCard title="Menunggu Validasi" value={metric(data?.awaitingReview.data, isLoading)} detail={detail(data?.awaitingReview.error, isLoading, "Aktivitas selesai yang perlu ditinjau")} icon="shield" tone="yellow" />
      <StatCard title="Aktivitas Hari Ini" value={metric(data?.todayActivities.data, isLoading)} detail={detail(data?.todayActivities.error, isLoading, "Berdasarkan tanggal lokal hari ini")} icon="activity" tone="red" />
    </section>

    <section className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,1fr)]">
      <ValidationQueue activities={data?.validationQueue.data?.activities ?? null} total={data?.validationQueue.data?.total ?? null} loading={isLoading} error={Boolean(data?.validationQueue.error ?? fatalError)} onReview={(activity, action) => setReview({ activity, action })} />
      <EmployeeSummary summaries={data?.employeeSummaries.data ?? null} loading={isLoading} error={Boolean(data?.employeeSummaries.error ?? fatalError)} />
    </section>

    <TodayActivities activities={data?.dailyActivities.data ?? null} loading={isLoading} error={Boolean(data?.dailyActivities.error ?? fatalError)} />
    {review && <ReviewDialog activity={review.activity} action={review.action} onClose={() => setReview(null)} onSuccess={finishReview} />}
  </main>;
}

function ValidationQueue({ activities, total, loading, error, onReview }: { activities: Activity[] | null; total: number | null; loading: boolean; error: boolean; onReview: (activity: Activity, action: "approve" | "reject") => void }) {
  return <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-sm">
    <header className="flex items-center justify-between gap-3 border-b border-[#e1e7ee] px-5 py-4 sm:px-6"><h2 className="font-bold text-[#172b4d]">Antrian Validasi</h2>{!loading && !error && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">{total ?? 0} Menunggu</span>}</header>
    <div className="space-y-3 p-4 sm:p-5">
      {loading ? <PanelMessage text="Memuat antrian validasi..." /> : error ? <PanelMessage text="Antrian validasi tidak tersedia." /> : !activities?.length ? <PanelMessage text="Tidak ada aktivitas yang menunggu validasi." /> : activities.map((activity) => <article key={activity.id} className="rounded-xl border border-[#dce4ec] bg-[#f8fafc] p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#43a956] text-xs font-bold text-white">{initials(activity.user.name)}</span><div className="min-w-0"><p className="truncate text-sm font-bold text-[#172b4d]">{activity.user.name}</p>{activity.task && <p className="mt-0.5 truncate text-xs font-semibold text-[#43a956]">Tugas: {activity.task.title}</p>}<p className="mt-0.5 truncate text-sm text-[#52657f]">{activity.title}</p><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#71829a]"><span>{activity.project?.name ?? "Tanpa proyek"}</span><span>{formatDate(activity.activity_date)}</span><span>{statusLabels[activity.status]}</span></div>{activity.media.length > 0 && <MediaList items={activity.media} />}</div></div>
          <div className="flex shrink-0 gap-2"><button type="button" onClick={() => onReview(activity, "approve")} className="rounded-lg bg-[#43a956] px-4 py-2 text-xs font-semibold text-white hover:bg-[#368f48]" aria-label={`Setujui aktivitas ${activity.title}`}>Setujui</button><button type="button" onClick={() => onReview(activity, "reject")} className="rounded-lg border border-[#d8e0e9] bg-white px-4 py-2 text-xs font-semibold text-[#60738f] hover:bg-slate-50" aria-label={`Minta revisi aktivitas ${activity.title}`}>Minta Revisi</button></div>
        </div>
      </article>)}
    </div>
    <footer className="border-t border-[#e1e7ee] px-5 py-3 text-right"><Link href="/project-manager/activities" className="text-sm font-semibold text-[#2f9e44] hover:underline">Lihat semua aktivitas</Link></footer>
  </section>;
}

function EmployeeSummary({ summaries, loading, error }: { summaries: EmployeeActivitySummary[] | null; loading: boolean; error: boolean }) {
  return <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-sm">
    <header className="border-b border-[#e1e7ee] px-5 py-4 sm:px-6"><h2 className="font-bold text-[#172b4d]">Ringkasan Aktivitas Karyawan</h2></header>
    <div className="space-y-5 p-5 sm:p-6">{loading ? <PanelMessage text="Memuat ringkasan karyawan..." /> : error ? <PanelMessage text="Ringkasan karyawan tidak tersedia." /> : !summaries?.length ? <PanelMessage text="Belum ada aktivitas karyawan pada proyek Anda." /> : summaries.slice(0, 5).map((summary) => <article key={summary.userId} className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#317f79] text-xs font-bold text-white">{initials(summary.name)}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#172b4d]">{summary.name}</p><p className="text-xs text-[#71829a]">{summary.division ?? "Divisi —"}</p></div><span className="text-xs font-medium text-[#52657f]">{summary.total} aktivitas</span></div><div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold"><span className="rounded-full bg-green-100 px-2.5 py-1 text-green-700">{summary.approved} disetujui</span><span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-700">{summary.awaitingReview} menunggu</span><span className="rounded-full bg-red-100 px-2.5 py-1 text-red-700">{summary.rejected} revisi</span></div></div>
    </article>)}</div>
  </section>;
}

function TodayActivities({ activities, loading, error }: { activities: Activity[] | null; loading: boolean; error: boolean }) {
  return <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-sm">
    <header className="border-b border-[#e1e7ee] px-5 py-4 sm:px-6"><h2 className="font-bold text-[#172b4d]">Aktivitas Hari Ini</h2></header>
    <div className="max-w-full overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[#f1f4f8] text-[#60738f]"><tr><th className="px-5 py-3">Karyawan</th><th className="px-5 py-3">Divisi</th><th className="px-5 py-3">Aktivitas</th><th className="px-5 py-3">Proyek</th><th className="px-5 py-3">Tanggal</th><th className="px-5 py-3">Status</th></tr></thead><tbody>
      {loading ? <TableMessage text="Memuat aktivitas hari ini..." /> : error ? <TableMessage text="Aktivitas hari ini tidak tersedia." /> : !activities?.length ? <TableMessage text="Belum ada aktivitas hari ini." /> : activities.map((activity) => <tr key={activity.id} className="border-b border-[#e1e7ee] last:border-0"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#43a956] text-[10px] font-bold text-white">{initials(activity.user.name)}</span><span className="font-medium text-[#172b4d]">{activity.user.name}</span></div></td><td className="px-5 py-4 text-[#60738f]">{activity.user.division?.name ?? "—"}</td><td className="px-5 py-4 font-medium text-[#172b4d]">{activity.title}</td><td className="px-5 py-4 text-[#60738f]">{activity.project?.name ?? "—"}</td><td className="px-5 py-4 text-[#60738f]">{formatDate(activity.activity_date)}</td><td className="px-5 py-4"><StatusBadge status={activity.status} /></td></tr>)}
    </tbody></table></div>
  </section>;
}

function ReviewDialog({ activity, action, onClose, onSuccess }: { activity: Activity; action: "approve" | "reject"; onClose: () => void; onSuccess: (message: string) => void }) {
  const [reason, setReason] = useState(""); const [saving, setSaving] = useState(false); const [message, setMessage] = useState(""); const revising = action === "reject";
  const errorId = `dashboard-activity-${activity.id}-review-error`;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (revising && !reason.trim()) { setMessage("Alasan revisi wajib diisi."); return; } setSaving(true); setMessage("");
    try {
      // Istilah "Revisi" di UI memakai kontrak reject backend agar alasan
      // tercatat dan aturan transisi status tetap menjadi source of truth API.
      const response = revising ? await rejectActivity(activity.id, reason.trim()) : await approveActivity(activity.id); onSuccess(response.message);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Keputusan gagal disimpan."); } finally { setSaving(false); }
  }
  return <AdminDialog title={revising ? "Minta Revisi" : "Setujui Aktivitas"} onClose={onClose}><form onSubmit={submit} className="space-y-4 p-5 sm:p-6">{revising ? <p className="text-sm text-[#60738f]">Minta revisi untuk <strong className="text-[#172b4d]">{activity.title}</strong> milik {activity.user.name}?</p> : <div className="space-y-1 text-sm text-[#60738f]"><p className="font-semibold text-[#172b4d]">Setujui aktivitas ini?</p><p>Setelah disetujui, aktivitas akan berstatus Disetujui.</p></div>}{revising && <label className="block text-sm font-semibold text-[#172b4d]">Alasan Revisi<textarea required maxLength={1000} rows={4} value={reason} placeholder="Jelaskan bagian yang perlu diperbaiki..." aria-invalid={Boolean(message)} aria-describedby={message ? errorId : undefined} onChange={(event) => { setReason(event.target.value); if (message) setMessage(""); }} className="mt-2 w-full rounded-xl border border-[#dce4ec] p-3 font-normal" /></label>}{message && <p id={errorId} role="alert" className="text-sm text-red-600">{message}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={onClose} disabled={saving} className="rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-60">Batal</button><button type="submit" disabled={saving} className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${revising ? "bg-amber-600" : "bg-[#18a84f]"}`}>{saving ? "Memproses..." : revising ? "Kirim Permintaan Revisi" : "Setujui"}</button></div></form></AdminDialog>;
}

function StatusBadge({ status }: { status: ActivityStatus }) { const tone = status === "approved" ? "bg-green-100 text-green-700" : status === "rejected" ? "bg-red-100 text-red-700" : status === "selesai" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"; return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>{statusLabels[status]}</span>; }
function PanelMessage({ text }: { text: string }) { return <p className="flex min-h-44 items-center justify-center px-4 text-center text-sm text-[#71829a]">{text}</p>; }
function TableMessage({ text }: { text: string }) { return <tr><td colSpan={6} className="px-6 py-16 text-center text-[#71829a]">{text}</td></tr>; }
function metric(value: number | null | undefined, loading: boolean): number | string { return loading || value === null || value === undefined ? "—" : value; }
function detail(error: unknown, loading: boolean, text: string) { if (loading) return "Memuat data..."; return error ? "Data tidak tersedia" : text; }
function initials(name: string) { return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "—"; }
function formatDate(value: string) { const [year, month, day] = value.slice(0, 10).split("-").map(Number); return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(year, month - 1, day)); }
