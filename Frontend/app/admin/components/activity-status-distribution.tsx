import type { ActivityStatus } from "../../services/activity-service";

type StatusDistributionProps = {
  counts: Record<ActivityStatus, number>;
  total: number;
};

const statusCategories = [
  {
    key: "awaiting",
    label: "Menunggu Validasi",
    bar: "bg-amber-500",
    text: "text-amber-600",
    getCount: (counts: Record<ActivityStatus, number>) =>
      (counts.selesai ?? 0) + (counts.pending ?? 0),
  },
  {
    key: "approved",
    label: "Disetujui",
    bar: "bg-[#20be63]",
    text: "text-[#18a84f]",
    getCount: (counts: Record<ActivityStatus, number>) => counts.approved ?? 0,
  },
  {
    key: "rejected",
    label: "Perlu Revisi",
    bar: "bg-red-500",
    text: "text-red-600",
    getCount: (counts: Record<ActivityStatus, number>) => counts.rejected ?? 0,
  },
];

export default function ActivityStatusDistribution({
  counts,
  total,
}: StatusDistributionProps) {
  return (
    <section className="rounded-2xl border border-[#dce4ec] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      <header className="border-b border-[#e1e7ee] px-5 py-4">
        <h2 className="text-sm font-bold text-[#172b4d]">Distribusi Status Aktivitas</h2>
      </header>

      <div className="space-y-3.5 p-5">
        {total === 0 ? (
          <p className="py-8 text-center text-xs text-[#71829a]">
            Belum ada aktivitas untuk dihitung.
          </p>
        ) : (
          statusCategories.map((item) => {
            const count = item.getCount(counts);
            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

            return (
              <div key={item.key}>
                <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-[#172b4d]">{item.label}</span>
                  <span className={`font-bold ${item.text}`}>{count}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[#e3e8ef]">
                    <div
                      className={`h-full rounded-full ${item.bar} transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-[#71829a]">
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
