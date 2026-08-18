export type ProjectReportRow = {
  id: number;
  name: string;
  client_name: string;
  start_date: string;
  end_date: string | null;
  status: string;
  activityCount: number;
};

export default function ProjectReportTable({ rows }: { rows: ProjectReportRow[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      <div className="max-w-full overflow-x-auto p-4 sm:p-6">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead className="bg-[#f1f4f8] text-[#60738f]">
            <tr>
              <th className="px-4 py-3 font-semibold">Proyek</th>
              <th className="px-4 py-3 font-semibold">Klien</th>
              <th className="px-4 py-3 font-semibold">Tanggal Mulai</th>
              <th className="px-4 py-3 font-semibold">Tanggal Akhir</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Total Aktivitas</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-14 text-center text-[#71829a]">
                  Tidak ada proyek pada filter laporan ini.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-[#e1e7ee] last:border-0">
                  <td className="px-4 py-4 font-medium text-[#172b4d]">{row.name}</td>
                  <td className="px-4 py-4 text-[#60738f]">{row.client_name}</td>
                  <td className="px-4 py-4 text-[#60738f]">{formatDate(row.start_date)}</td>
                  <td className="px-4 py-4 text-[#60738f]">
                    {row.end_date ? formatDate(row.end_date) : "—"}
                  </td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-600">
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-medium text-[#172b4d]">{row.activityCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}
