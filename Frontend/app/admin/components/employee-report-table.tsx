export type EmployeeReportRow = {
  userId: number;
  total: number;
  approved: number;
};

export default function EmployeeReportTable({ rows }: { rows: EmployeeReportRow[] }) {
  return (
    <ReportTableShell>
      <table className="w-full min-w-[900px] border-collapse text-left text-sm">
        <thead className="bg-[#f1f4f8] text-[#60738f]">
          <tr>
            <th className="px-4 py-3 font-semibold">Karyawan</th>
            <th className="px-4 py-3 font-semibold">Divisi</th>
            <th className="px-4 py-3 font-semibold">Total Aktivitas</th>
            <th className="px-4 py-3 font-semibold">Disetujui</th>
            <th className="px-4 py-3 font-semibold">Ditolak</th>
            <th className="px-4 py-3 font-semibold">Jam Kerja</th>
            <th className="px-4 py-3 font-semibold">Skor</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-14 text-center text-[#71829a]">
                Tidak ada aktivitas pada filter laporan ini.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.userId} className="border-b border-[#e1e7ee] last:border-0">
                <td className="px-4 py-4">
                  <span className="font-medium text-[#172b4d]">—</span>
                  <span className="ml-2 text-xs text-[#91a0b3]">User ID {row.userId}</span>
                </td>
                <td className="px-4 py-4 text-[#71829a]">—</td>
                <td className="px-4 py-4 font-medium text-[#172b4d]">{row.total}</td>
                <td className="px-4 py-4 font-medium text-[#172b4d]">{row.approved}</td>
                <td className="px-4 py-4 text-[#71829a]">—</td>
                <td className="px-4 py-4 text-[#71829a]">—</td>
                <td className="px-4 py-4 text-[#71829a]">—</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </ReportTableShell>
  );
}

function ReportTableShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      <div className="max-w-full overflow-x-auto p-4 sm:p-6">{children}</div>
    </section>
  );
}
