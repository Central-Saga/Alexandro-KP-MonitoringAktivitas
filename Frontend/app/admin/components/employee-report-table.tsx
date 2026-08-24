export type EmployeeReportRow = {
  userId: number;
  name: string;
  division: string;
  total: number;
  awaitingValidation: number;
  approved: number;
  needsRevision: number;
};

export default function EmployeeReportTable({
  rows,
}: {
  rows: EmployeeReportRow[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[850px] border-collapse text-left text-xs sm:text-sm">
          <thead className="bg-[#f1f4f8] text-[#60738f]">
            <tr>
              <th className="px-5 py-3.5 font-semibold">Karyawan</th>
              <th className="px-5 py-3.5 font-semibold">Divisi</th>
              <th className="px-5 py-3.5 font-semibold">Jumlah Aktivitas</th>
              <th className="px-5 py-3.5 font-semibold">Menunggu Validasi</th>
              <th className="px-5 py-3.5 font-semibold">Disetujui</th>
              <th className="px-5 py-3.5 font-semibold">Perlu Revisi</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-14 text-center text-xs text-[#71829a]"
                >
                  Tidak ada data aktivitas karyawan pada filter laporan ini.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.userId}
                  className="border-b border-[#e1e7ee] last:border-0 hover:bg-slate-50/60"
                >
                  <td className="px-5 py-4 font-semibold text-[#172b4d]">
                    {row.name}
                  </td>
                  <td className="px-5 py-4 text-xs text-[#71829a]">
                    {row.division}
                  </td>
                  <td className="px-5 py-4 font-bold text-[#172b4d]">
                    {row.total}
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                      {row.awaitingValidation}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                      {row.approved}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                      {row.needsRevision}
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
