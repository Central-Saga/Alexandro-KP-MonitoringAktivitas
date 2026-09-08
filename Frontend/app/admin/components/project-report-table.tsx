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
  isLoading = false,
}: {
  rows: ProjectReportRow[];
  isLoading?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#d0e6ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse text-left text-xs sm:text-sm">
          <thead className="bg-[#EAF7FB] text-[#030303]">
            <tr className="border-b border-[#d0e6ed]">
              <th className="px-4 py-3 font-semibold sm:px-5">Nama Proyek</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Nama Klien</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Project Manager</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Periode</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Status</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Total Aktivitas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#d0e6ed]">
            {isLoading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-xs text-[#5a737e]"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#016273] border-t-transparent" />
                    <span>Memuat data laporan proyek...</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-xs text-[#5a737e]"
                >
                  Tidak ada data proyek pada filter laporan ini.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-[#EAF7FB]/40"
                >
                  <td className="px-4 py-3 font-semibold text-[#030303] sm:px-5 sm:py-3.5">
                    {row.name}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#5a737e] sm:px-5 sm:py-3.5">
                    {row.client_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#5a737e] sm:px-5 sm:py-3.5">
                    {row.project_manager_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#5a737e] sm:px-5 sm:py-3.5">
                    {formatDate(row.start_date)} – {formatDate(row.end_date)}
                  </td>
                  <td className="px-4 py-3 sm:px-5 sm:py-3.5">
                    <ProjectStatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 font-bold text-[#030303] sm:px-5 sm:py-3.5">
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

function ProjectStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  let toneClass = "bg-slate-100 text-slate-700 ring-slate-600/20";

  if (normalized === "selesai" || normalized === "completed") {
    toneClass = "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
  } else if (
    normalized === "berjalan" ||
    normalized === "berlangsung" ||
    normalized === "active"
  ) {
    toneClass = "bg-[#EAF7FB] text-[#016273] ring-[#016273]/20";
  } else if (
    normalized === "perencanaan" ||
    normalized === "draft" ||
    normalized === "pending"
  ) {
    toneClass = "bg-amber-50 text-amber-700 ring-amber-600/20";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${toneClass}`}
    >
      {formatStatus(status)}
    </span>
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
