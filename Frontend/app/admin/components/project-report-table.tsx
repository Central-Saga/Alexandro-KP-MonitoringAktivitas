export type ProjectReportRow = {
  id: number;
  name: string;
  client_name: string;
  project_manager_name: string;
  start_date: string;
  end_date: string | null;
  status: string;
  activityCount: number;
};

export default function ProjectReportTable({
  rows,
}: {
  rows: ProjectReportRow[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-left text-xs sm:text-sm">
          <thead className="bg-[#f1f4f8] text-[#60738f]">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Nama Proyek</th>
              <th className="px-5 py-3.5 font-semibold">Nama Klien</th>
              <th className="px-5 py-3.5 font-semibold">Project Manager</th>
              <th className="px-5 py-3.5 font-semibold">Periode</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
              <th className="px-5 py-3.5 font-semibold">Total Aktivitas</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-14 text-center text-xs text-[#71829a]"
                >
                  Tidak ada data proyek pada filter laporan ini.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[#e1e7ee] last:border-0 hover:bg-slate-50/60"
                >
                  <td className="px-5 py-4 font-semibold text-[#172b4d]">
                    {row.name}
                  </td>
                  <td className="px-5 py-4 text-xs text-[#60738f]">
                    {row.client_name || "—"}
                  </td>
                  <td className="px-5 py-4 text-xs text-[#60738f]">
                    {row.project_manager_name || "—"}
                  </td>
                  <td className="px-5 py-4 text-xs text-[#71829a]">
                    {formatDate(row.start_date)} – {formatDate(row.end_date)}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      {formatStatus(row.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-bold text-[#172b4d]">
                    {row.activityCount}
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

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}
