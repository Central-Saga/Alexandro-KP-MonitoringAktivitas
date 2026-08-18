import Link from "next/link";
import type { Activity } from "../../services/activity-service";
import MediaList from "./media-list";

const statusLabel: Record<string, string> = {
  approved: "Disetujui",
  ongoing: "Berjalan",
  pending: "Menunggu",
  selesai: "Selesai",
};

const statusTone: Record<string, string> = {
  approved: "bg-green-100 text-green-700",
  ongoing: "bg-blue-100 text-blue-700",
  pending: "bg-amber-100 text-amber-700",
  selesai: "bg-emerald-100 text-emerald-700",
};

export default function RecentActivityTable({
  activities,
}: {
  activities: Activity[];
}) {
  return (
    <section className="rounded-2xl border border-[#dce4ec] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      <header className="flex items-center justify-between border-b border-[#e1e7ee] px-6 py-5">
        <h2 className="font-bold text-[#172b4d]">Aktivitas Terbaru</h2>
        <Link
          href="/admin/activities"
          className="rounded-xl border border-[#43a956] px-4 py-2 text-sm font-semibold text-[#2f9e44] hover:bg-green-50"
        >
          Lihat Semua
        </Link>
      </header>

      <div className="overflow-x-auto p-6">
        <table className="w-full min-w-[780px] border-collapse text-left text-sm">
          <thead className="bg-[#f1f4f8] text-[#60738f]">
            <tr>
              <th className="px-4 py-3 font-semibold">Karyawan</th>
              <th className="px-4 py-3 font-semibold">Divisi</th>
              <th className="px-4 py-3 font-semibold">Aktivitas</th>
              <th className="px-4 py-3 font-semibold">Jam</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {activities.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-[#71829a]">
                  Belum ada aktivitas terbaru.
                </td>
              </tr>
            ) : (
              activities.slice(0, 5).map((activity) => (
                <tr key={activity.id} className="border-b border-[#e1e7ee] last:border-0">
                  <td className="px-4 py-4 text-[#60738f]">—</td>
                  <td className="px-4 py-4 text-[#60738f]">—</td>
                  <td className="px-4 py-4 font-medium text-[#172b4d]">
                    {activity.title}
                    <MediaList items={activity.media} />
                  </td>
                  <td className="px-4 py-4 text-[#60738f]">—</td>
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
