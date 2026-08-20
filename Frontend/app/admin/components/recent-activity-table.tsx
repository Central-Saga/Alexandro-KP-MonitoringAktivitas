import Link from "next/link";
import type { Activity } from "../../services/activity-service";
import MediaList from "./media-list";

const statusLabel: Record<string, string> = {
  approved: "Disetujui",
  ongoing: "Berjalan",
  pending: "Menunggu",
  rejected: "Ditolak",
  selesai: "Selesai",
};

const statusTone: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  ongoing: "bg-blue-100 text-blue-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
  selesai: "bg-emerald-100 text-emerald-700",
};

type RecentActivityTableProps = {
  activities: Activity[] | null;
  isLoading: boolean;
  hasError: boolean;
};

export default function RecentActivityTable({ activities, isLoading, hasError }: RecentActivityTableProps) {
  return (
    <section className="rounded-2xl border border-[#dce4ec] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      <header className="flex items-center justify-between border-b border-[#e1e7ee] px-6 py-5">
        <h2 className="font-bold text-[#172b4d]">Aktivitas Terbaru</h2>
        <Link
          href="/admin/activities"
          className="rounded-xl border border-[#43a956] px-4 py-2 text-sm font-semibold text-[#2f9e44] hover:bg-green-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#43a956]"
        >
          Lihat Semua
        </Link>
      </header>

      <div className="overflow-x-auto p-6" aria-busy={isLoading}>
        <table className="w-full min-w-[780px] border-collapse text-left text-sm">
          <thead className="bg-[#f1f4f8] text-[#60738f]">
            <tr>
              <th className="px-4 py-3 font-semibold">Karyawan</th>
              <th className="px-4 py-3 font-semibold">Divisi</th>
              <th className="px-4 py-3 font-semibold">Aktivitas</th>
              <th className="px-4 py-3 font-semibold">Tanggal</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <MessageRow message="Memuat aktivitas terbaru..." />
            ) : hasError ? (
              <MessageRow message="Aktivitas terbaru tidak tersedia." alert />
            ) : !activities?.length ? (
              <MessageRow message="Belum ada aktivitas terbaru." />
            ) : (
              activities.map((activity) => (
                <tr key={activity.id} className="border-b border-[#e1e7ee] last:border-0">
                  <td className="px-4 py-4 font-medium text-[#172b4d]">{activity.user?.name ?? "—"}</td>
                  <td className="px-4 py-4 text-[#60738f]">{activity.user?.division?.name ?? "—"}</td>
                  <td className="px-4 py-4 font-medium text-[#172b4d]">
                    <p>{activity.title}</p>
                    <p className="mt-1 text-xs font-normal text-[#71829a]">{activity.project?.name ?? "—"}</p>
                    <MediaList items={activity.media} />
                  </td>
                  <td className="px-4 py-4 text-[#60738f]">{formatDate(activity.activity_date)}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone[activity.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {statusLabel[activity.status] ?? activity.status}
                    </span>
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

function MessageRow({ message, alert = false }: { message: string; alert?: boolean }) {
  return (
    <tr>
      <td colSpan={5} role={alert ? "alert" : "status"} className="px-4 py-10 text-center text-[#71829a]">
        {message}
      </td>
    </tr>
  );
}

function formatDate(value: string) {
  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return "—";

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}
