import Link from "next/link";
import type { Activity } from "../../services/activity-service";
import MediaList from "./media-list";

const statusLabel: Record<string, string> = {
  approved: "Disetujui",
  ongoing: "Berjalan",
  pending: "Menunggu Validasi",
  rejected: "Perlu Revisi",
  selesai: "Menunggu Validasi",
};

const statusTone: Record<string, string> = {
  approved: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20",
  ongoing: "bg-[#edf5e9] text-[#245f3e] ring-1 ring-inset ring-[#245f3e]/20",
  pending: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
  rejected: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20",
  selesai: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20",
};

type RecentActivityTableProps = {
  activities: Activity[] | null;
  isLoading: boolean;
  hasError: boolean;
};

export default function RecentActivityTable({ activities, isLoading, hasError }: RecentActivityTableProps) {
  return (
    <section className="rounded-2xl border border-[#d3e5d1] bg-white shadow-[0_1px_3px_rgba(23,61,43,0.05)]">
      <header className="flex items-center justify-between border-b border-[#d3e5d1] px-6 py-5">
        <h2 className="font-bold text-[#030303]">Aktivitas Terbaru</h2>
        <Link
          href="/admin/activities"
          className="rounded-xl border border-[#245f3e]/30 px-4 py-2 text-sm font-semibold text-[#245f3e] hover:bg-[#edf5e9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#245f3e]"
        >
          Lihat Semua
        </Link>
      </header>

      <div className="overflow-x-auto p-6" aria-busy={isLoading}>
        <table className="w-full min-w-[780px] border-collapse text-left text-sm">
          <thead className="bg-[#edf5e9] text-[#030303]">
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
                <tr key={activity.id} className="border-b border-[#d3e5d1] hover:bg-[#edf5e9]/50 transition-colors last:border-0">
                  <td className="px-4 py-4 font-medium text-[#030303]">{activity.user?.name ?? "—"}</td>
                  <td className="px-4 py-4 text-[#61776a]">{activity.user?.division?.name ?? "—"}</td>
                  <td className="px-4 py-4 font-medium text-[#030303]">
                    <p>{activity.title}</p>
                    <p className="mt-1 text-xs font-normal text-[#61776a]">{activity.project?.name ?? "—"}</p>
                    <MediaList items={activity.media} />
                  </td>
                  <td className="px-4 py-4 text-[#61776a]">{formatDate(activity.activity_date)}</td>
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
      <td colSpan={5} role={alert ? "alert" : "status"} className="px-4 py-10 text-center text-[#718074]">
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
