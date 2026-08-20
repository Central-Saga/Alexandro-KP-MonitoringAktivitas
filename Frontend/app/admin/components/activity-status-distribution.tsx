import type { ActivityStatus } from "../../services/activity-service";

const statusMeta: Record<
  ActivityStatus,
  { label: string; bar: string; text: string }
> = {
  pending: { label: "Menunggu", bar: "bg-amber-400", text: "text-amber-500" },
  ongoing: { label: "Berjalan", bar: "bg-blue-500", text: "text-blue-600" },
  selesai: { label: "Selesai", bar: "bg-emerald-500", text: "text-emerald-600" },
  approved: { label: "Disetujui", bar: "bg-[#20be63]", text: "text-[#18a84f]" },
  rejected: { label: "Ditolak", bar: "bg-red-500", text: "text-red-600" },
};

export default function ActivityStatusDistribution({
  counts,
  total,
}: {
  counts: Record<ActivityStatus, number>;
  total: number;
}) {
  return (
    <section className="rounded-2xl border border-[#dce4ec] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      <header className="border-b border-[#e1e7ee] px-6 py-5">
        <h2 className="font-bold text-[#172b4d]">Distribusi Status Aktivitas</h2>
      </header>

      <div className="space-y-5 p-6">
        {total === 0 ? (
          <p className="py-14 text-center text-sm text-[#71829a]">
            Belum ada aktivitas untuk dihitung.
          </p>
        ) : (
          (Object.keys(statusMeta) as ActivityStatus[]).map((status) => {
            const count = counts[status];
            const percentage = Math.round((count / total) * 100);
            const meta = statusMeta[status];

            return (
              <div key={status}>
                <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-[#172b4d]">{meta.label}</span>
                  <span className={`font-bold ${meta.text}`}>{count}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[#e3e8ef]">
                    <div
                      className={`h-full rounded-full ${meta.bar}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-9 text-right text-xs text-[#71829a]">
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
