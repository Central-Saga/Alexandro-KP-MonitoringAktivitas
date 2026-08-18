import { AdminIcon } from "./admin-icons";

export type EmployeeActivitySummary = {
  userId: number;
  total: number;
  approved: number;
};

export default function EmployeePerformanceTable({
  monthLabel,
  employees,
}: {
  monthLabel: string;
  employees: EmployeeActivitySummary[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#dce4ec] bg-white shadow-[0_2px_5px_rgba(15,23,42,0.05)]">
      <header className="border-b border-[#e1e7ee] px-6 py-5">
        <h2 className="font-bold text-[#172b4d]">
          Performa Karyawan — {monthLabel}
        </h2>
      </header>

      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:p-6">
        <label className="relative min-w-0 flex-1">
          <AdminIcon
            name="search"
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#91a0b3]"
          />
          <input
            type="search"
            disabled
            placeholder="Cari karyawan..."
            aria-label="Cari karyawan"
            title="Nama karyawan belum tersedia pada response Activity"
            className="h-12 w-full rounded-xl border border-[#dce4ec] bg-white pl-12 pr-4 text-sm outline-none placeholder:text-[#91a0b3] disabled:cursor-not-allowed"
          />
        </label>
        <button
          type="button"
          disabled
          title="Endpoint Activity belum mendukung filter"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#dce4ec] bg-white px-5 text-sm font-semibold text-[#60738f] opacity-60"
        >
          <AdminIcon name="filter" className="h-5 w-5" />
          Filter
        </button>
      </div>

      <div className="max-w-full overflow-x-auto px-4 pb-5 sm:px-6">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="bg-[#f1f4f8] text-[#60738f]">
            <tr>
              <th className="px-4 py-3 font-semibold">Karyawan</th>
              <th className="px-4 py-3 font-semibold">Divisi</th>
              <th className="px-4 py-3 font-semibold">Total Aktivitas</th>
              <th className="px-4 py-3 font-semibold">Disetujui</th>
              <th className="px-4 py-3 font-semibold">Jam Kerja</th>
              <th className="px-4 py-3 font-semibold">Skor</th>
              <th className="px-4 py-3 font-semibold">Performa</th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-[#71829a]">
                  Belum ada aktivitas karyawan pada bulan ini.
                </td>
              </tr>
            ) : (
              employees.map((employee) => (
                <tr
                  key={employee.userId}
                  className="border-b border-[#e1e7ee] last:border-0"
                >
                  <td className="px-4 py-4">
                    <span className="font-medium text-[#172b4d]">—</span>
                    <span className="ml-2 text-xs text-[#91a0b3]">
                      User ID {employee.userId}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-[#71829a]">—</td>
                  <td className="px-4 py-4 font-medium text-[#172b4d]">
                    {employee.total}
                  </td>
                  <td className="px-4 py-4 font-medium text-[#172b4d]">
                    {employee.approved}
                  </td>
                  <td className="px-4 py-4 text-[#71829a]">—</td>
                  <td className="px-4 py-4 text-[#71829a]">—</td>
                  <td className="px-4 py-4 text-[#71829a]">—</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
