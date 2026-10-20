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
  approved: "bg-[#e9f0e8] text-[#42664a]",
  ongoing: "bg-[#e9eeee] text-[#456461]",
  pending: "bg-[#f3efe3] text-[#806b3e]",
  rejected: "bg-[#f2e9e6] text-[#8a5145]",
  selesai: "bg-[#f3efe3] text-[#806b3e]",
};

type RecentActivityTableProps = {
  activities: Activity[] | null;
  isLoading: boolean;
  hasError: boolean;
};

export default function RecentActivityTable({ activities, isLoading, hasError }: RecentActivityTableProps) {
  return (
    <section className="rounded-xl border border-[#e0e3dc] bg-[#fbfbf8]">
      <header className="flex items-center justify-between border-b border-[#e6e8e2] px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-sm font-semibold text-[#20292a]">Aktivitas terbaru</h2>
          <p className="mt-1 text-xs text-[#737d79]">Laporan aktivitas yang baru masuk</p>
        </div>
        <Link
          href="/admin/activities"
          className="rounded-lg border border-[#d8ded7] px-3 py-2 text-xs font-semibold text-[#426d68] hover:bg-[#f1f3ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#426d68]"
        >
          Lihat Semua
        </Link>
      </header>

      <div className="overflow-x-auto p-4 sm:p-5" aria-busy={isLoading}>
        <table className="w-full min-w-[780px] border-collapse text-left text-sm">
          <thead className="border-b border-[#e2e5df] text-[#687470]">
            <tr>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em]">Karyawan</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em]">Divisi</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em]">Aktivitas</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em]">Tanggal</th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.1em]">Status</th>
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
                <tr key={activity.id} className="border-b border-[#eceee9] transition-colors hover:bg-[#f5f6f2] last:border-0">
                  <td className="px-4 py-4 font-medium text-[#293333]">{activity.user?.name ?? "—"}</td>
                  <td className="px-4 py-4 text-[#737d79]">{activity.user?.division?.name ?? "—"}</td>
                  <td className="px-4 py-4 font-medium text-[#293333]">
                    <p>{activity.title}</p>
                    <p className="mt-1 text-xs font-normal text-[#737d79]">{activity.project?.name ?? "—"}</p>
                    <MediaList items={activity.media} />
                  </td>
                  <td className="px-4 py-4 text-[#737d79]">{formatDate(activity.activity_date)}</td>
                  <td className="px-4 py-4">
                    <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${statusTone[activity.status] ?? "bg-[#eef0ec] text-[#65706b]"}`}>
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
