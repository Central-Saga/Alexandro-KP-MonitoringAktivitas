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
  isLoading = false,
}: {
  rows: EmployeeReportRow[];
  isLoading?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#d0e6ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[780px] border-collapse text-left text-xs sm:text-sm">
          <thead className="bg-[#EAF7FB] text-[#030303]">
            <tr className="border-b border-[#d0e6ed]">
              <th className="px-4 py-3 font-semibold sm:px-5">Karyawan</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Divisi</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Jumlah Aktivitas</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Menunggu Validasi</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Disetujui</th>
              <th className="px-4 py-3 font-semibold sm:px-5">Perlu Revisi</th>
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
                    <span>Memuat data laporan karyawan...</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-xs text-[#5a737e]"
                >
                  Tidak ada data aktivitas karyawan pada filter laporan ini.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.userId}
                  className="transition-colors hover:bg-[#EAF7FB]/40"
                >
                  <td className="px-4 py-3 sm:px-5 sm:py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#EAF7FB] text-xs font-bold text-[#016273]">
                        {row.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="font-semibold text-[#030303]">
                        {row.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#5a737e] sm:px-5 sm:py-3.5">
                    {row.division}
                  </td>
                  <td className="px-4 py-3 font-bold text-[#030303] sm:px-5 sm:py-3.5">
                    {row.total}
                  </td>
                  <td className="px-4 py-3 sm:px-5 sm:py-3.5">
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                      {row.awaitingValidation}
                    </span>
                  </td>
                  <td className="px-4 py-3 sm:px-5 sm:py-3.5">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      {row.approved}
                    </span>
                  </td>
                  <td className="px-4 py-3 sm:px-5 sm:py-3.5">
                    <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
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
