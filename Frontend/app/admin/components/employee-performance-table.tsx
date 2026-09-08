import { AdminIcon } from "./admin-icons";

export type EmployeeActivitySummary = {
  userId: number;
  total: number;
  approved: number;
  name: string;
  division: string | null;
};

export default function EmployeePerformanceTable({
  monthLabel,
  employees,
}: {
  monthLabel: string;
  employees: EmployeeActivitySummary[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#d0e6ed] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <header className="border-b border-[#d0e6ed] px-6 py-5">
        <h2 className="font-bold text-[#030303]">
          Performa Karyawan — {monthLabel}
        </h2>
      </header>

      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:p-6">
        <label className="relative min-w-0 flex-1">
          <AdminIcon
            name="search"
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8399a2]"
          />
          <input
            type="search"
            disabled
            placeholder="Cari karyawan..."
            aria-label="Cari karyawan"
            title="Nama karyawan belum tersedia pada response Activity"
            className="h-12 w-full rounded-xl border border-[#d0e6ed] bg-white pl-12 pr-4 text-sm outline-none placeholder:text-[#8399a2] disabled:cursor-not-allowed"
          />
        </label>
        <button
          type="button"
          disabled
          title="Endpoint Activity belum mendukung filter"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#d0e6ed] bg-white px-5 text-sm font-semibold text-[#5a737e] opacity-60"
        >
          <AdminIcon name="filter" className="h-5 w-5" />
          Filter
        </button>
      </div>

      <div className="max-w-full overflow-x-auto px-4 pb-5 sm:px-6">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="bg-[#EAF7FB] text-[#030303]">
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
                <td colSpan={7} className="px-6 py-12 text-center text-[#5a737e]">
                  Belum ada aktivitas karyawan pada bulan ini.
                </td>
              </tr>
            ) : (
              employees.map((employee) => (
                <tr
                  key={employee.userId}
                  className="border-b border-[#d0e6ed] last:border-0 hover:bg-[#EAF7FB]/40 transition-colors"
                >
                  <td className="px-4 py-4">
                    <span className="font-medium text-[#030303]">{employee.name}</span>
                  </td>
                  <td className="px-4 py-4 text-[#5a737e]">{employee.division ?? "—"}</td>
                  <td className="px-4 py-4 font-medium text-[#030303]">
                    {employee.total}
                  </td>
                  <td className="px-4 py-4 font-medium text-[#030303]">
                    {employee.approved}
                  </td>
                  <td className="px-4 py-4 text-[#5a737e]">—</td>
                  <td className="px-4 py-4 text-[#5a737e]">—</td>
                  <td className="px-4 py-4 text-[#5a737e]">—</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
